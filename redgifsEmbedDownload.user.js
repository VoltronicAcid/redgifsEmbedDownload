// ==UserScript==
// @name        Embedded RedGIFs Downloader
// @description Download embedded gifs from RedGIFs.
// @author      VoltronicAcid
// @version     0.1
// @match       http*://*redgifs.com/ifr/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=redgifs.com
// @run-at      document-end
// ==/UserScript==

(() => {
    "use strict";

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0&icon_names=download,download_done&display=block";
    document.head.append(stylesheet);

    const mediaUrls = {};

    const origParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        const jsonObj = origParse.call(JSON, text, reviver);

        if ("gif" in jsonObj) {
            const { urls } = jsonObj.gif;

            for (const [type, url] of Object.entries(urls)) {
                const extension = url.split(/\.|\//).at(-1);

                if (extension === "mp4") {
                    mediaUrls[type] = url;
                }
            }

            JSON.parse = origParse;
        }

        return jsonObj;
    };

    async function downloadVideo(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
            }

            const objUrl = URL.createObjectURL(new Blob(chunks));
            const link = document.createElement("a");
            link.href = objUrl;
            link.download = url.split("/").at(-1);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objUrl);
        } catch (error) {
            console.error('Error fetching file:', error);
        }
    };

    new MutationObserver((mutations, observer) => {
        const player = mutations
            .filter(({ addedNodes }) => addedNodes.length)
            .flatMap(record => Array.from(record.addedNodes.values()))
            .find(node => node.classList.contains("embeddedPlayer"));

        if (player) {
            const video = player.querySelector("video");

            if (video) {
                observer.disconnect();
                const url = mediaUrls.hd ?? mediaUrls.sd ?? mediaUrls.silent;

                if (url) {
                    const button = document.createElement("span");
                    button.classList.add("material-symbols-outlined", "button");
                    button.innerText = "download";
                    button.style.cursor = "pointer";

                    const handlerOptions = { once: true };
                    const handleClick = async () => {
                        await downloadVideo(url);

                        button.innerText = "download_done";
                        button.style.cursor = "";
                        button.removeEventListener("click", handleClick, handlerOptions);
                    };

                    button.addEventListener("click", handleClick, handlerOptions);

                    const buttonsContainer = player.querySelector("div.buttons");
                    buttonsContainer.appendChild(button);
                }
            }
        }
    }).observe(document.body, { subtree: true, childList: true, });
})();
