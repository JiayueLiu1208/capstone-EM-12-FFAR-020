const VOTE_URL = "#";

const voteLink = document.querySelector("#vote-link");
const qrImage = document.querySelector("#site-qr");
const siteUrl = document.querySelector("#site-url");

const pageUrl = window.location.href.split("#")[0];

if (VOTE_URL === "#") {
  voteLink.addEventListener("click", (event) => event.preventDefault());
} else {
  voteLink.href = VOTE_URL;
  voteLink.removeAttribute("aria-disabled");
  voteLink.target = "_blank";
  voteLink.rel = "noreferrer";
}

siteUrl.textContent = pageUrl;
qrImage.src =
  "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=" +
  encodeURIComponent(pageUrl);
