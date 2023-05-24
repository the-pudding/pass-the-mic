let count = 0;

const counterDiv = document.createElement("div");
counterDiv.style.position = "fixed";
counterDiv.style.top = "16px";
counterDiv.style.right = "16px";
counterDiv.style.zIndex = "99999";
counterDiv.style.padding = "4px";
counterDiv.style.border = "1px solid black";
counterDiv.style.backgroundColor = "white";
counterDiv.textContent = `changes: ${count}`;
document.body.appendChild(counterDiv);

const config = { attributes: true, childList: true, subtree: true };

const callback = function (mutationsList, observer) {
  console.log(mutationsList);
  for (let mutation of mutationsList) {
    if (mutation.type === "childList") {
      count++;
      counterDiv.textContent = `changes: ${count}`;
    }
  }
};

const observer = new MutationObserver(callback);

const el = document.querySelector("h1");
if (el) observer.observe(el, config);

console.log(el);
