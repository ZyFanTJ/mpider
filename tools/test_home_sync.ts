/** 同步与恢复展示契约：服务开启不冒充会话有效，等待恢复不冒充正在采集。 */
import test from "node:test";
import assert from "node:assert/strict";
import { homeSyncState, needsSessionRecovery, recoveryIsWaiting, recoveryMessage } from "../frontend/src/lib/home-sync.ts";
import type { Task, Source, Discovery } from "../frontend/src/lib/workbench.ts";
const task = (extra: Partial<Task> = {}): Task => ({id:1,kind:"history",biz:"fake",state:"needs_action",target:{pages:1,cursor_id:1},progress:{completed:0,skipped:0,new_articles:0,pages:0,failed:0,partial:0,rebuilds:0,rebuilding:false,finished_ids:[],blocked_session_id:"old"},reason:null,next_action_at:0,created_at:0,updated_at:0,result_path:null,...extra});
const source = (session_id: string) => ({session_id} as Source);
test("连接中和关闭均不得显示同步就绪", () => {
  assert.equal(homeSyncState({state:"starting"} as Discovery).ready,false);
  assert.equal(homeSyncState({state:"running"} as Discovery).ready,true);
  assert.equal(homeSyncState({state:"failed"} as Discovery).text,"识别失败");
});
test("旧记录按已保存阶段显示失败位置，并保留具体错误", () => {
  const failed = (phases: string[], reason = "主页同步已中断，请检查微信登录状态后重新开启") =>
    homeSyncState({ state: "failed", reason, phases: phases.map((phase, ts) => ({ phase, ts })) } as Discovery);
  const early = failed(["materialize", "worker_spawned", "stop_requested", "worker_reaped"]);
  assert.equal(early.text, "启动失败");
  assert.equal(early.reason, "上次识别进程在就绪前已结束。");
  assert.equal(failed(["worker_spawned"], "当前 Python 环境缺少主页识别所需的模块。").reason, "当前 Python 环境缺少主页识别所需的模块。");
  assert.equal(failed(["worker_spawned", "ready", "worker_reaped"]).text, "运行中断");
  assert.equal(failed([]).reason, "本次主页识别已结束，具体原因未记录。");
  assert.equal(failed([], "数据目录不可写").reason, "数据目录不可写");
});
test("只有旧会话仍在使用时要求恢复；新会话已保存可直接继续", () => {
  assert.equal(needsSessionRecovery(task(),source("old")),true);
  assert.equal(needsSessionRecovery(task(),source("new")),false);
  assert.equal(needsSessionRecovery(task({kind:"home"}),source("old")),true);
  assert.equal(needsSessionRecovery(task({kind:"archive"}),source("old")),false);
  assert.equal(needsSessionRecovery(task({state:"done"}),source("old")),false);
});
test("旧版本的会话过期记录也进入恢复入口", () => {
  assert.equal(needsSessionRecovery(task({progress:{...task().progress,blocked_session_id:null},reason:"H5 Session Timeout"}),source("old")),true);
});
test("后台等待分阶段显示，暂停后不能再显示自动继续", () => {
  const t=task({progress:{...task().progress,session_recovery:{discovery_id:1,requested_at:10,previous_session_id:"old",phase:"waiting_home"}}});
  assert.equal(recoveryIsWaiting(t),true);assert.match(recoveryMessage(t),/请在微信打开/);
  assert.equal(recoveryIsWaiting({...t,state:"paused"}),false);
  t.progress.session_recovery!.phase="preparing_session";assert.match(recoveryMessage(t),/已收到目标公众号首页/);
});
