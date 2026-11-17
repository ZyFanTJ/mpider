#!/usr/bin/env python3
"""组装固定依赖的 Windows x64 便携发行包；不运行微信、不读取用户数据。"""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent
# 发行资料逐项列出；源码 archive 没有 .git，不能递归复制工作目录中的私有材料。
PUBLIC_DOCUMENTS = (
    "docs/windows-standalone.md",
    "docs/how-it-works.md",
    "docs/faq.md",
    "docs/laboratory.md",
    "docs/request-policy.md",
    "docs/push-monitor.md",
    "docs/advertisements.md",
    "docs/article-export.md",
    "docs/source-deletion.md",
    "docs/app-updates.md",
    "docs/system-logs.md",
    "docs/wechat-session-protocol.md",
    "docs/screenshots/workbench-sources.png",
    "docs/screenshots/workbench-articles.png",
    "docs/screenshots/workbench-tasks.png",
)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download(item, cache):
    path = cache / (item["sha256"][:16] + "-" + item["filename"])
    if path.is_file() and digest(path) == item["sha256"]:
        return path
    for attempt in range(3):
        try:
            with urllib.request.urlopen(item["url"], timeout=120) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != item["sha256"]:
                raise ValueError(f"下载摘要不匹配：{item['filename']}")
            path.write_bytes(data)
            return path
        except OSError:
            if attempt == 2:
                raise
            time.sleep(2)


def extract(archive, directory):
    with zipfile.ZipFile(archive) as bundle:
        for item in bundle.infolist():
            target = (directory / item.filename).resolve()
            if not target.is_relative_to(directory.resolve()):
                raise ValueError("压缩包路径越界")
        bundle.extractall(directory)


def verify_pe(executable):
    data = executable.read_bytes()
    if data[:2] != b"MZ" or len(data) < 64:
        raise ValueError("程序不是 Windows PE 文件")
    offset = struct.unpack_from("<I", data, 0x3C)[0]
    if data[offset:offset + 4] != b"PE\0\0" or struct.unpack_from("<H", data, offset + 4)[0] != 0x8664:
        raise ValueError("程序不是 Windows x64 PE 文件")


def assemble_runtime(runtime, lock, cache):
    runtime.mkdir(parents=True)
    extract(download(lock["python"], cache), runtime)
    # ._pth 保持嵌入式隔离，依赖只从便携目录加载。
    (runtime / "python312._pth").write_text("python312.zip\n.\nsession-deps\n", encoding="utf-8")
    dependencies = runtime / "session-deps"
    dependencies.mkdir()
    for item in lock["packages"]:
        extract(download(item, cache), dependencies)


def install_desktop_runtime(destination, source, lock, cache):
    destination = destination.resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.name != "runtime":
        raise ValueError("源码版运行环境目标目录必须名为 runtime")
    with tempfile.TemporaryDirectory(prefix=".mpider-runtime-", dir=destination.parent) as temporary:
        staging = Path(temporary) / "runtime"
        if source and (source / "release-manifest.json").is_file():
            manifest = json.loads((source / "release-manifest.json").read_text(encoding="utf-8"))
            expected = {item["name"]: item["version"] for item in lock["packages"]}
            if manifest["python"] != lock["python"]["version"] or manifest["packages"] != expected:
                raise ValueError("现有便携包的运行依赖与版本锁不符")
            files = {name: checksum for name, checksum in manifest["files"].items()
                     if name.startswith("runtime/")}
            if "runtime/python.exe" not in files or "runtime/python312._pth" not in files:
                raise ValueError("便携包清单缺少 Python 运行环境")
            for name, checksum in files.items():
                original = (source / name).resolve()
                copied = (Path(temporary) / name).resolve()
                if not original.is_relative_to((source / "runtime").resolve()) or not copied.is_relative_to(staging):
                    raise ValueError("运行环境清单路径越界")
                if digest(original) != checksum:
                    raise ValueError(f"现有运行环境文件摘要不匹配：{name}")
                copied.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(original, copied)
        else:
            assemble_runtime(staging, lock, cache)
        for item in lock["licenses"]:
            license_source = ROOT / item["path"]
            if digest(license_source) != item["sha256"]:
                raise ValueError(f"许可全文摘要不匹配：{item['filename']}")
            shutil.copy2(license_source, staging / item["filename"])
        check = """
import json, sys, frida, cryptography, cffi, pycparser
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
key = AESGCM.generate_key(bit_length=128)
aes = AESGCM(key)
nonce, message = b'0' * 12, b'mpider-runtime-check'
assert aes.decrypt(nonce, aes.encrypt(nonce, message, None), None) == message
print(json.dumps({'python': '.'.join(map(str, sys.version_info[:3])),
 'frida': frida.__version__, 'cryptography': cryptography.__version__,
 'cffi': cffi.__version__, 'pycparser': pycparser.__version__}))
"""
        result = subprocess.run([str(staging / "python.exe"), "-I", "-B", "-c", check],
                                check=True, capture_output=True, text=True, timeout=60)
        versions = json.loads(result.stdout)
        if versions != {"python": lock["python"]["version"], **{item["name"]: item["version"] for item in lock["packages"]}}:
            raise ValueError("便携 Python 自检版本与版本锁不符")
        previous = Path(temporary) / "previous"
        if destination.exists():
            destination.rename(previous)
        try:
            staging.rename(destination)
        except OSError:
            if previous.exists():
                previous.rename(destination)
            raise
    print(f"源码版便携运行环境已就绪：{destination}")
    print(json.dumps(versions))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exe", type=Path)
    parser.add_argument("--prefetch", action="store_true", help="只下载并校验锁定的运行环境，在长构建前暴露网络问题")
    parser.add_argument("--output", type=Path, default=ROOT / "dist-windows")
    parser.add_argument("--revision", default="source-archive")
    parser.add_argument("--runtime-only", type=Path, help="只准备源码版 EXE 旁的 runtime 目录")
    parser.add_argument("--runtime-source", type=Path, help="复用已校验的现有便携发行目录")
    args = parser.parse_args()
    if not args.prefetch and args.runtime_only is None:
        if args.exe is None:
            parser.error("组装便携包需要 --exe")
        verify_pe(args.exe)
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    lock = json.loads((ROOT / "tools/windows-runtime.lock.json").read_text(encoding="utf-8"))
    requirements = (ROOT / "native/requirements.txt").read_text(encoding="utf-8").splitlines()
    for item in lock["packages"]:
        requirement = f"{item['name']}=={item['version']}"
        if requirement not in requirements:
            raise ValueError(f"运行依赖与锁定包不一致：{requirement}")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    cache = output / ".downloads"
    cache.mkdir(exist_ok=True)
    if args.runtime_only is not None:
        install_desktop_runtime(args.runtime_only, args.runtime_source, lock, cache)
        return
    if args.prefetch:
        for item in (lock["python"], *lock["packages"]):
            download(item, cache)
        print(f"运行环境已就绪：{cache}")
        return
    package_name = f"MPider-v{version}-windows-x64"
    stage = output / package_name
    if stage.exists():
        shutil.rmtree(stage)
    runtime = stage / "runtime"
    assemble_runtime(runtime, lock, cache)
    dependencies = runtime / "session-deps"
    licenses = stage / "licenses"
    licenses.mkdir()
    for item in lock["licenses"]:
        # 全文随仓库固定：gnu.org 常拒绝构建机连接，不让发行卡在长构建之后。
        source = ROOT / item["path"]
        if digest(source) != item["sha256"]:
            raise ValueError(f"许可全文摘要不匹配：{item['filename']}")
        shutil.copy2(source, licenses / item["filename"])
    subprocess.run([sys.executable, str(ROOT / "tools/collect-third-party-licenses.py"),
                    "--output", str(licenses / "dependencies"), "--cache", str(cache)], check=True)
    # wheel 原有的完整 LICENSE/COPYING 及元数据原样留在 runtime/session-deps。
    required_licenses = [
        runtime / "LICENSE.txt",
        dependencies / "frida-17.23.3.dist-info/licenses/COPYING",
        dependencies / "cryptography-50.0.2.dist-info/licenses/LICENSE.APACHE",
        dependencies / "cryptography-50.0.2.dist-info/licenses/LICENSE.BSD",
        dependencies / "cffi-2.0.0.dist-info/licenses/LICENSE",
        dependencies / "pycparser-2.23.dist-info/LICENSE",
        licenses / "Frida-COPYING.LIB",
    ]
    if any(not path.is_file() for path in required_licenses):
        raise ValueError("运行环境缺少完整许可证")
    shutil.copy2(args.exe, stage / "MPider.exe")
    for filename in ("LICENSE", "THIRD-PARTY-NOTICES.md", "README.md"):
        shutil.copy2(ROOT / filename, stage / filename)
    for filename in ("CHANGELOG.md", "SECURITY.md", "CONTRIBUTING.md"):
        if (ROOT / filename).is_file():
            shutil.copy2(ROOT / filename, stage / filename)
    # 只带已审阅文档与三张无真实数据的演示截图；缺文件即停止，不回退旧截图。
    for document_name in PUBLIC_DOCUMENTS:
        path = ROOT / document_name
        if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(ROOT.resolve()):
            raise ValueError(f"发行公开资料缺失或路径不合法：{document_name}")
        destination = stage / document_name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)
    shutil.copy2(ROOT / "tools/windows-runtime.lock.json", stage / "runtime-lock.json")
    (stage / "使用说明.txt").write_text(
        "MPider Windows x64 便携版\n\n"
        "完整解压到可写目录，双击 MPider.exe；不要只复制 EXE。\n"
        "依赖 Windows 10/11 x64、Microsoft WebView2、已登录的匹配版本微信。\n"
        "已附 Python/Frida，无需安装 Node.js、pnpm、Rust 或系统 Python。\n"
        "设置中的 Python 路径保留默认 python，即使用旁边 runtime/python.exe。\n"
        "当前工作台不要求安装根证书或修改系统代理。\n"
        "此程序未代码签名；首次识别依赖微信版本，Frida 仍可能引发微信崩溃。\n"
        "仅在自己有权访问的范围内使用；请求预算和冷却不保证账号不会受限制。\n"
        "关闭窗口进入托盘，从托盘退出才停止程序。\n"
        "反馈：https://github.com/areyoubugcoder/mpider/issues/new/choose\n",
        encoding="utf-8-sig",
    )
    files = {path.relative_to(stage).as_posix(): digest(path)
             for path in sorted(stage.rglob("*")) if path.is_file()}
    manifest = {"version": version, "target": "x86_64-pc-windows-msvc",
                "source_revision": args.revision, "python": lock["python"]["version"],
                "packages": {item["name"]: item["version"] for item in lock["packages"]},
                "files": files}
    (stage / "release-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    archive = output / f"{package_name}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, strict_timestamps=False) as bundle:
        for path in sorted(stage.rglob("*")):
            if path.is_file():
                bundle.write(path, path.relative_to(stage).as_posix())
    (output / "SHA256SUMS").write_text(f"{digest(archive)}  {archive.name}\n", encoding="ascii")
    print(f"便携包：{archive}")
    print(f"文件数：{len(files)}；SHA-256：{digest(archive)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main()
