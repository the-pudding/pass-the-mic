// (async () => {
//   const base = "pass-the-mic";

//   async function getStorage(key) {
//     return new Promise((resolve, reject) => {
//       try {
//         chrome.storage.local.get(key, (value) => resolve(value[key]));
//       } catch (err) {
//         reject(err);
//       }
//     });
//   }

//   async function setStorage(key, value) {
//     return new Promise((resolve, reject) => {
//       try {
//         chrome.storage.local.set({ [key]: value }, resolve);
//       } catch (err) {
//         reject(err);
//       }
//     });
//   }

//   async function init() {
//     const settings = [...document.querySelectorAll("input")].map(
//       (input) => input.id
//     );
//     settings.forEach(async (setting) => {
//       const key = `${base}-${setting}`;
//       const value = await getStorage(key);
//       document.getElementById(setting).checked = value || false;
//       document.getElementById(setting).addEventListener("change", (e) => {
//         setStorage(key, e.target.checked);
//       });
//     });
//   }

//   init();
// })();
