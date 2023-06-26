const primary = "#FF77AA";
const visPadding = 16;
const minWidth = 160;
const jargonTerms = [
  "action plan",
  "actionable",
  "agile",
  "alignment",
  "all hands on deck",
  "analysis paralysis",
  "around the horn",
  "asap",
  "back to the drawing board",
  "balls in the air",
  "bandwidth",
  "bang for your buck",
  "big bang for the buck",
  "bells and whistles",
  "best in class",
  "bleeding edge",
  "blue ocean",
  "blue sky thinking",
  "boil the ocean",
  "brain dump",
  "buy in",
  "change agent",
  "circle back",
  "circle the wagons",
  "close of play",
  "core competency",
  "corporate culture",
  "corporate values",
  "customer centric",
  "deep dive",
  "deliverable",
  "disconnect",
  "do more with less",
  "double click",
  "drill down",
  "drink the kool aid",
  "ducks in a row",
  "ecosystem",
  "800 pound gorilla",
  "elephant in the room",
  "engagement",
  "frictionless",
  "game changer",
  "going forward",
  "growth hacking",
  "guru",
  "ideate",
  "ideation",
  "in the weeds",
  "key takeaway",
  "laser focused",
  "lipstick on a pig",
  "lots of moving parts",
  "low hanging fruit",
  "make hay while the sun shines",
  "make it pop",
  "mission critical",
  "move the goal posts",
  "move the needle",
  "new normal",
  "ninja",
  "on my radar",
  "on the runway",
  "open the kimono",
  "organic growth",
  "out of pocket",
  "pain point",
  "pain points",
  "par for the course",
  "paradigm shift",
  "peel the onion",
  "pivot",
  "price point",
  "price points",
  "proactive",
  "productize",
  "push the envelope",
  "roadmap",
  "reinvent the wheel",
  "run it up the flagpole",
  "run the numbers",
  "scalability",
  "scalable",
  "secret sauce",
  "skin in the game",
  "synergy",
  "take it offline",
  "take offline",
  "take this offline",
  "test the water",
  "test the waters",
  "30000 foot view",
  "thought leader",
  "thought leadership",
  "tiger team",
  "touch base",
  "trim the fat",
  "value add",
  "vertical",
  "win win",
  "window of opportunity",
];

const speakerNodes = new Map();
const debug = true;
const base = "pass-the-mic";
const refreshSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-ccw"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';

const shareSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';

let speakers = new Map();
let jargonTracker = {};
let options;
let nameYou = "You";
let captionsButtonEl;
let captionsContainerEl;
let showJargon;
let threshold = 0;
let thresholdPercent = 1;
let numSpeakers = 1;

function setStorage(key, value) {
  window.localStorage.setItem(`${base}-${key}`, value);
}

function getStorage(key) {
  return window.localStorage.getItem(`${base}-${key}`);
}

function prepareData() {
  const all = [];

  for (let [key, captions] of speakers) {
    const splits = key.split("|");
    const name = splits[0];
    const count = d3.sum(
      Object.values(captions).map((d) => d.replace(/ /g, "").length)
    );
    all.push({ key, name, count });
  }

  const filtered = all.filter((d) => d.count > 0);

  const total = d3.sum(filtered.map((d) => d.count));
  const percents = filtered.map((d) => ({ ...d, percent: d.count / total }));

  // sort by count
  percents.sort((a, b) => b.percent - a.percent);

  // TODO min width
  const w =
    document.querySelector(".ptm-vis").getBoundingClientRect().width -
    visPadding;

  const withWidth = percents.map((d) => ({
    ...d,
    width: d.percent * w,
  }));

  const withGroup = withWidth.map((d, i) => ({
    ...d,
    group: d.width > minWidth ? i : -1,
  }));

  const clean = d3
    .groups(withGroup, (d) => d.group)
    .map(([group, members]) => {
      if (group === -1)
        return {
          percent: d3.sum(members, (d) => d.percent),
          name: "Others",
          members,
        };
      return members[0];
    });

  return clean;
}

function updateThreshold() {
  threshold = (1 / numSpeakers) * thresholdPercent;
}

function updateNumSpeakers() {
  const total = document.querySelectorAll("[data-self-name]").length;
  const ignoreCount = d3.selectAll(".speaker.ignore").size();
  numSpeakers = total - ignoreCount;
  updateThreshold();
}

function toggleIgnore() {
  const value = d3.select(this).classed("ignore");
  d3.select(this).classed("ignore", !value);
  updateNumSpeakers();
}

function highlight(d) {
  if (d3.select(this).classed("ignore")) return false;
  if (d.key === "Others") return false;
  return d.percent >= threshold;
}

function showMembers() {
  d3.select(this).select(".members").classed("visible", true);
}

function hideMembers() {
  d3.select(this).select(".members").classed("visible", false);
}

function renderVis() {
  const data = prepareData();

  const speakerEnter = (enter) => {
    const speaker = enter.append("div");

    speaker.attr("class", "speaker").attr("aria-role", "button");
    // .on("mouseenter", showMembers)
    // .on("mouseleave", hideMembers);

    speaker.append("div").attr("class", "bar");

    speaker.style("width", (d) => d3.format(".1%")(d.percent));

    const label = speaker.append("p").attr("class", "label text-outline");

    label
      .append("span")
      .attr("class", "name")
      .text((d) => (d.name === "You" ? nameYou : d.name));

    const percent = label.append("span").attr("class", "percent").text("0%");
    percent.text((d) => d3.format(".0%")(d.percent));

    speaker.on("click", toggleIgnore);

    // speaker.append("ul").attr("class", "members");

    return speaker;
  };

  // const memberEnter = (enter) => {
  //   const member = enter.append("li").attr("class", "member text-outline");
  //   member
  //     .append("span")
  //     .attr("class", "name")
  //     .text((d) => (d.name === "You" ? nameYou : d.name));

  //   member
  //     .append("span")
  //     .attr("class", "percent")
  //     .text((d) => d3.format(".0%")(d.percent));
  //   return member;
  // };

  const joined = d3
    .select(".ptm-vis")
    .selectAll(".speaker")
    .data(data, (d) => d.key)
    .join(speakerEnter);

  joined
    .classed("highlight", highlight)
    .style("width", (d) => d3.format(".1%")(d.percent));

  joined.select(".percent").text((d) => d3.format(".0%")(d.percent));

  // const member = joined
  //   .select(".members")
  //   .data((d) => {
  //     console.log(d);
  //     return d.members || [];
  //   })
  //   .selectAll(".member")
  //   .join(memberEnter);

  // member.select(".percent").text((d) => d3.format(".0%")(d.percent));
}

function renderJargon(id, index, terms) {
  terms.forEach((term) => {
    const key = `${id}${index}${term}`;
    const value = jargonTracker[key];
    if (!value) {
      jargonTracker[key] = true;
      const rot1 = Math.floor(
        Math.random() * 15 * (Math.random() < 0.5 ? 1 : -1)
      );
      const rot2 = Math.floor(
        Math.random() * 15 * (Math.random() < 0.5 ? 1 : -1)
      );
      const scale = 1 + Math.random() * 3;
      const left = 20 + Math.random() * 60;
      const top = 10 + Math.random() * 10;
      const duration = 2500 + Math.random() * 1500;
      const fs = 14;
      d3.select("body")
        .append("p")
        .attr("class", "ptm-jargon text-outline")
        .text(term)
        .style("left", `${left}%`)
        .style("top", "100%")
        .style("font-size", `${fs}px`)
        .style("transform", `rotate(${rot1}deg)`)
        .transition()
        .ease(d3.easeLinear)
        .duration(duration)
        .style("top", `${top}%`)
        .style("opacity", 0)
        .style("transform", `scale(${scale}) rotate(${rot2}deg)`)
        .remove();
    }
  });
}

function waitForElement(selector, callback, timeout = 1000) {
  const intervalId = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(intervalId);
      callback(element);
    }
  }, timeout);
}

function cleanText(text) {
  // replace all non-alphanumeric characters with a space
  const a = text.toLowerCase().replace(/[^a-zA-Z0-9]/g, " ");
  return ` ${a} `;
}

function checkForJargon(text) {
  return jargonTerms.filter((term) => text.includes(` ${term} `));
}

function handleTextChange(id, node) {
  let newJargon;

  node.parentNode.querySelectorAll("span").forEach((node) => {
    const index = +node.getAttribute("data-index");
    const text = cleanText(node.innerText);
    speakers.get(id)[index] = text;
    if (showJargon) {
      newJargon = checkForJargon(text);
      if (newJargon.length) renderJargon(id, index, newJargon);
    }
  });

  renderVis();
}

function setIndex(id, node) {
  const newIndex = speakers.get(id).length || 0;
  node.setAttribute("data-index", newIndex);
}

function handleSpeakerUpdate(id, mutationsList) {
  for (let mutation of mutationsList) {
    const type = mutation.type;
    const target = mutation.target;
    const addedNode = mutation.addedNodes[0];
    const nodeName = addedNode?.nodeName;

    if (addedNode && nodeName === "SPAN") {
      setIndex(id, addedNode);
      handleTextChange(id, target);
    } else if (addedNode && nodeName === "#text") {
      handleTextChange(id, target);
    } else if (type === "characterData") {
      handleTextChange(id, target.parentNode);
    }
  }
}

function observeSpeaker(el) {
  const imgNode = el.childNodes[0];
  const nameNode = el.childNodes[1];
  const speechNode = el.childNodes[2].childNodes[0];
  const name = nameNode.textContent;

  const suffix = imgNode.src.split("/").pop().replace(/\W/g, "");
  const id = `${name}|${suffix}`;

  const exists = speakers.has(id);

  if (!exists) speakers.set(id, []);

  const node = speechNode.childNodes[0];

  if (node) {
    setIndex(id, node);
    handleTextChange(id, node);
  }

  // listen for future spans
  const config = {
    attributes: false,
    childList: true,
    subtree: true,
    characterData: true,
  };

  const observer = new MutationObserver((mutationsList) => {
    handleSpeakerUpdate(id, mutationsList);
    if (!document.contains(speechNode)) observer.disconnect();
  });

  observer.observe(speechNode, config);
}

function updateSpeakers() {
  // const videos = document.querySelectorAll("[data-layout]");
  // videos.forEach((video) => {
  //   const name = video
  //     .querySelector("[data-self-name]")
  //     .getAttribute("data-self-name");
  //   const suffix = video
  //     .querySelector("img")
  //     .getAttribute("src")
  //     .split("/")
  //     .pop()
  //     .replace(/\W/g, "");
  //   const id = `${name}|${suffix}`;
  //   const exists = speakers.has(id);
  //   if (!exists) speakers.set(id, []);
  //   console.log(id);
  // });
  updateNumSpeakers();
}

function handlePersonChange(mutationsList) {
  updateSpeakers();

  for (let mutation of mutationsList) {
    if (mutation.addedNodes.length) {
      observeSpeaker(mutation.addedNodes[0]);
    }
  }
}

function getYouName() {
  const el = document.querySelector("#yDmH0d");
  const html = el?.innerHTML || "";
  const a = html.split('","https://accounts.google.com/AccountChooser')[0];
  nameYou = a ? a.substring(a.lastIndexOf('"') + 1, a.length) : "You";
}

function updateOptions() {
  const opts = {};
  options.forEach((key) => {
    const value = getStorage(key);
    opts[key] = value;
  });

  const visEl = document.querySelector(".ptm-vis");

  const { display } = window.getComputedStyle(captionsContainerEl);

  // enable
  if (opts.enable === "true") {
    if (display == "none" && captionsButtonEl) captionsButtonEl.click();
    if (!visEl) observeCaptions();
    d3.select(captionsButtonEl).attr("data-ptm", "true");

    d3.select(captionsButtonEl.parentNode).attr(
      "title",
      "Pass The Mic is enabled. Toggle caption visibility in the options."
    );
  } else {
    // if we were previously running it AND captions are visible, hide them
    if (visEl && display !== "none") {
      if (captionsButtonEl) captionsButtonEl.click();
      d3.select(".ptm-vis").remove();
    }
    d3.select(captionsButtonEl).attr("data-ptm", null);
    d3.select(captionsButtonEl.parentNode).attr("title", null);
    // TODO disconnect observer
  }

  // captions
  d3.select(captionsContainerEl).style(
    "opacity",
    opts.captions === "true" ? 1 : 0
  );

  // jargon
  showJargon = opts.jargon === "true";

  // threshold
  thresholdPercent = +opts.threshold / 100 + 1;
  updateThreshold();
}

function observeCaptions() {
  const visEl = document.createElement("div");
  visEl.classList.add("ptm-vis");
  document.body.appendChild(visEl);

  getYouName();

  const el = captionsContainerEl.childNodes[0].childNodes[0];
  const config = { attributes: false, childList: true, subtree: false };
  const observer = new MutationObserver(handlePersonChange);
  observer.observe(el, config);
}

function toggleSettings() {
  const el = ".ptm-popup .settings";
  d3.select(el).classed("active", !d3.select(el).classed("active"));
}

function resetSpeakers() {
  // iterate through all speakers and reset their count value
  speakers.forEach((value, key) => {
    speakers.set(key, []);
  });
  jargonTracker = {};
  renderVis();
}

function createPopup() {
  const margin = 8;
  const outer = 96;
  const w = outer - margin;
  const w1 = w - 24;
  const w2 = w - 16;

  const popup = d3.select("body").append("div").attr("class", "ptm-popup");

  const buttons = popup.append("div").attr("class", "buttons");

  const btnSettings = buttons
    .append("button")
    .attr("class", "btn-settings")
    .attr("aria-label", "Pass The Mic settings")
    .on("click", toggleSettings);

  btnSettings.append("span").attr("class", "icon text-outline").text("🎤");
  btnSettings
    .append("span")
    .attr("class", "label text-outline")
    .text("settings");

  const btnReset = buttons
    .append("button")
    .attr("class", "btn-reset")
    .attr("aria-label", "reset Pass The Mic")
    .on("click", resetSpeakers);

  btnReset.append("span").attr("class", "icon text-outline").html(refreshSvg);

  btnReset.append("span").attr("class", "label text-outline").text("reset");

  const settings = popup.append("div").attr("class", "settings").html(`
		<section id="intro">
			<h3>Pass The Mic Settings</h3>
		</section>
		
		<section id="options">
			<fieldset>
				<legend>options</legend>
				<div class="flex">
					<input type="checkbox" id="enable" checked>
					<label for="enable">Enable</label>
				</div>
				<div class="flex">
					<input type="checkbox" id="captions">
					<label for="captions">Show captions</label>
				</div>
				<div class="flex">
					<input type="checkbox" id="jargon">
					<label for="jargon">Show jargon</label>
				</div>
				<div>
					<label for="threshold">Highlight threshold:</label>
					<p>The percent over an equal speaking share to trigger highlight</p>
					<input type="range" id="threshold" value="50">
				</div>

			</fieldset>
		</section>

		<section id="howto">
			<h4><strong>Tips</strong></h4>
			<p>Click a person to remove them from the speaker count.</p>
		</section>

		<section id="outro">
			<ul>
				<li><a href="https://github.com/the-pudding/pass-the-mic/issues" target="_blank" rel="noreferrer">Report a bug</a></li>
				<li><a href="https://github.com/the-pudding/pass-the-mic/issues?q=is%3Aissue+is%3Aopen+label%3Afeature" target="_blank" rel="noreferrer">Feature roadmap</a></li>
				<li><a href="mailto:russell@pudding.cool">Feature requests</a></li>
				<li>By <a href="https://pudding.cool/author/russell-samora" target="_blank" rel="noreferrer">Russell Samora</a> for <a href="https://pudding.cool" target="_blank" rel="noreferrer">The
					Pudding</a>.</li>				
			</ul>
		</section>
	`);

  settings
    .append("button")
    .text("Close")
    .on("click", () => settings.classed("active", false));

  options = [...document.querySelectorAll(".ptm-popup .settings input")].map(
    (input) => input.id
  );

  options.forEach((key) => {
    const value = getStorage(key);

    // set based on local storage values or defaults
    if (key === "threshold") {
      const v = value || "50";
      document.getElementById(key).value = v;
      setStorage(key, v);
    } else {
      const defaultValue = key === "enable";
      let checked;
      if (value === "true") checked = true;
      else if (value === "false") checked = false;
      else {
        checked = defaultValue;
        setStorage(key, defaultValue);
      }

      document.getElementById(key).checked = checked;
    }
    document.getElementById(key).addEventListener("change", (e) => {
      const value = key === "threshold" ? e.target.value : e.target.checked;
      setStorage(key, value);
      updateOptions();
    });
  });
}

async function init(btn) {
  captionsButtonEl = btn;
  captionsContainerEl = document.querySelector(".a4cQT");
  createPopup();
  updateOptions();
}

waitForElement("[aria-label='Turn on captions (c)']", init);
