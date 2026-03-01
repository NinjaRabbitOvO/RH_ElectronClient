const homeWebview = document.getElementById("home-webview");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));
const transferDateInput = document.getElementById("transfer-date");
const transferButton = document.getElementById("start-transfer");
const transferActionStatus = document.getElementById("transfer-action-status");
const transferLog = document.getElementById("transfer-log");

function renderActiveNavigation() {
  const currentPage = document.body.dataset.currentPage;

  navButtons.forEach((button) => {
    const isActive = button.dataset.pageLink === currentPage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function bindHomeWebview() {
  if (!homeWebview) {
    return;
  }

  homeWebview.addEventListener("dom-ready", () => {
  });

  homeWebview.addEventListener("did-fail-load", () => {
    console.error("Google page could not be loaded in the embedded view.");
  });
}

function getDefaultTransferDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTransferOutput(result) {
  const output = [];

  if (result.command) {
    output.push(`> ${result.command}`);
  }

  if (result.stdout) {
    output.push(result.stdout.trim());
  }

  if (result.stderr) {
    output.push(result.stderr.trim());
  }

  return output.filter(Boolean).join("\n\n") || "No output returned.";
}

function bindTransferLauncher() {
  if (!transferDateInput || !transferButton || !transferActionStatus || !transferLog) {
    return;
  }

  if (!transferDateInput.value) {
    transferDateInput.value = getDefaultTransferDate();
  }

  transferButton.addEventListener("click", async () => {
    const selectedDate = transferDateInput.value;

    if (!selectedDate) {
      transferActionStatus.textContent = "Please choose a transfer date first.";
      return;
    }

    transferButton.disabled = true;
    transferActionStatus.textContent = "Running Python receiver...";
    transferLog.textContent = "Launching transfer job...";

    try {
      const result = await window.appApi.filetransfer.start(selectedDate);
      transferLog.textContent = formatTransferOutput(result);
      transferActionStatus.textContent = result.ok
        ? "Transfer completed. Review the log output below."
        : "Transfer failed. Review the error output below.";
    } catch (error) {
      transferActionStatus.textContent = "Transfer launch failed before the receiver started.";
      transferLog.textContent = error && error.message ? error.message : String(error);
      console.error(error);
    } finally {
      transferButton.disabled = false;
    }
  });
}

renderActiveNavigation();
bindHomeWebview();
bindTransferLauncher();
