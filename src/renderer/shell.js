const homeWebview = document.getElementById("home-webview");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));
const filetransferGate = document.getElementById("filetransfer-gate");
const filetransferConfirm = document.getElementById("filetransfer-confirm");
const filetransferContent = document.getElementById("filetransfer-content");

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

function bindFiletransferGate() {
  if (!filetransferGate || !filetransferConfirm || !filetransferContent) {
    return;
  }

  filetransferConfirm.addEventListener("click", () => {
    filetransferGate.classList.add("is-hidden");
    filetransferContent.classList.remove("is-hidden");
  });
}

renderActiveNavigation();
bindHomeWebview();
bindFiletransferGate();
