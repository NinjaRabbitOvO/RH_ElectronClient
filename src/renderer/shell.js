const homeWebview = document.getElementById("home-webview");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));

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

renderActiveNavigation();
bindHomeWebview();
