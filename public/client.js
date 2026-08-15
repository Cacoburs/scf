document.addEventListener("DOMContentLoaded", () => {
  const toast = document.querySelector(".toast-banner");
  if (toast && toast.classList.contains("show")) {
    setTimeout(() => toast.classList.remove("show"), 4000);
  }
});
