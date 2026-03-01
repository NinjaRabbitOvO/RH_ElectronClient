const runtimeInfo = document.getElementById("runtime-info");
const pingResult = document.getElementById("ping-result");

function renderRuntimeInfo() {
  const { chrome, node, electron } = window.appApi.versions;

  runtimeInfo.textContent =
    `Chrome ${chrome} | Node.js ${node} | Electron ${electron}`;
}

async function renderPingStatus() {
  try {
    const response = await window.appApi.ping();
    pingResult.textContent = `主进程响应: ${response}`;
  } catch (error) {
    pingResult.textContent = "主进程通信失败";
    console.error(error);
  }
}

renderRuntimeInfo();
renderPingStatus();
