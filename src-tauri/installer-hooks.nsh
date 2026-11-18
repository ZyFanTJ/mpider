; 下载入口放在欢迎页，电脑尚未安装 WebView2 时也能打开。
!define MUI_WELCOMEPAGE_TEXT "本安装包已附 Python、Frida 和加密依赖。$\r$\n$\r$\n安装时会检测 WebView2，缺少时自动从微软下载并安装。$\r$\n$\r$\n如自动下载失败，可使用下方链接手动安装 WebView2，然后重新运行本安装程序。"
!define MUI_PAGE_CUSTOMFUNCTION_SHOW MpiderWelcomeLinks

Function MpiderWelcomeLinks
  ${NSD_CreateLink} 120u 142u 195u 12u "手动下载 WebView2 在线安装程序"
  Pop $0
  ${NSD_OnClick} $0 MpiderDownloadWebView
  ${NSD_CreateLink} 120u 159u 195u 12u "下载完整离线安装程序（x64）"
  Pop $0
  ${NSD_OnClick} $0 MpiderDownloadOfflineWebView
FunctionEnd

Function MpiderDownloadWebView
  Pop $0
  ExecShell "open" "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
FunctionEnd

Function MpiderDownloadOfflineWebView
  Pop $0
  ExecShell "open" "https://go.microsoft.com/fwlink/?LinkId=2124701"
FunctionEnd
