const homeWebview = document.getElementById("home-webview");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));
const pages = Array.from(document.querySelectorAll(".page"));

function setActivePage(pageName) {
  navButtons.forEach((button) => {
    const isActive = button.dataset.pageTarget === pageName;
    button.classList.toggle("is-active", isActive);
  });

  pages.forEach((page) => {
    const isActive = page.dataset.page === pageName;
    page.classList.toggle("is-active", isActive);
  });
}

function bindNavigation() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActivePage(button.dataset.pageTarget);
    });
  });
}

function bindHomeWebview() {
  homeWebview.addEventListener("dom-ready", () => {
  });

  homeWebview.addEventListener("did-fail-load", () => {
    console.error("Google page could not be loaded in the embedded view.");
  });
}

bindNavigation();
bindHomeWebview();
