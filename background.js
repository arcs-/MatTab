// Listen for messages from content or popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getWebGlimpse") {
        getWebGlimpse(request.url)
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err }));
        return true; // Indicates async response
    }
});

// META tag keys
const META_IMAGES = [
    'msapplication-square152x152logo', 'msapplication-tileimage', 'twitter:image', '196x196', '180x180', '144x144', '96x96', 'thumbnail', 'primaryImageOfPage',
    'image_src', 'apple-touch-icon', 'og:image', '114x114', 'image/x-icon', 'apple-touch-icon-precomposed', 'fluid-icon',
    'previewIcon', 'msapplication-square32x32logo'
];
const META_IMAGES_SECOND = ['icon', 'shortcut icon', '32x32'];
const META_TITLE = ['og:title', 'og:site_name', 'application-name', 'twitter:title', 'apple-mobile-web-app-title', 'mswebdialog-title'];
const META_COLOR = ['msapplication-tilecolor', 'msapplication-navbutton-color', 'theme-color'];
const META_RSS = ['application/rss+xml', 'application/atom+xml'];
const META_DESCRIPTION = ['og:description', 'description'];

// Global variable for preloaded data
let preLoaded = {};
fetch('data/pages.json')
    .then(res => res.json())
    .then(json => { preLoaded = json; })
    .catch(() => { preLoaded = {}; });

// Helper to parse HTML meta/link tags
function parseMetaTags(rawDoc) {
    const meta = {};
    const metaTagRegex = /<meta[^>]*>|<link[^>]*>/g;
    const attrRegex = /([a-zA-Z\-:]+)=["']([^"']+)["']/g;
    const matches = rawDoc.match(metaTagRegex);
    if (!matches) return meta;
    for (const tag of matches) {
        let attrs = {};
        let m;
        while ((m = attrRegex.exec(tag)) !== null) {
            attrs[m[1].toLowerCase()] = m[2];
        }
        // Use sizes, rel, name, property, or type as key
        const key = attrs.sizes || attrs.rel || attrs.name || attrs.property || attrs.type;
        const value = attrs.content || attrs.href;
        if (key && value) meta[key.toLowerCase()] = value;
    }
    return meta;
}

// Helper to extract <title>
function extractTitle(rawDoc) {
    const match = rawDoc.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    return match ? match[1] : undefined;
}

// Helper to complete relative URLs
function complete(url, base_url) {
    if (!url) return null;
    if (url.includes('//')) return url;
    try {
        return new URL(url, base_url).href;
    } catch {
        return url;
    }
}

// Helper: try to upgrade to HTTPS, fallback to HTTP
async function tryUpgradeConnection(link) {
    let urlObj;
    try {
        urlObj = new URL(link.startsWith('http') ? link : 'https://' + link);
    } catch {
        return link;
    }
    const withoutProtocol = `${urlObj.host}${urlObj.pathname.length > 1 ? urlObj.pathname : ''}${urlObj.search}`;
    try {
        const res = await fetch('https://' + withoutProtocol, { method: 'GET', mode: 'cors' });
        if (res.ok) return 'https://' + withoutProtocol;
    } catch { }
    return 'http://' + withoutProtocol;
}

// Helper: fallback <img> tag with logo in src
function filterImageTag(rawDoc) {
    let rawImages = rawDoc.match(/<img[^>]*>/g);
    if (rawImages) {
        for (let img of rawImages) {
            let src = img.match(/src=['"]([^'"]*)['"]/);
            if (src && src[1] && src[1].toLowerCase().includes('logo')) return src[1];
        }
    }
    return false;
}

// Main function to get website data
async function getWebGlimpse(url) {
    url = url.trim();
    if (!url) throw new Error('Empty URL');

    // Try to upgrade connection (prefer https)
    url = await tryUpgradeConnection(url);

    // Prepare return value
    const websiteData = { input: url };

    // Check preloaded data
    let prop_url;
    try {
        prop_url = (new URL(url)).hostname.replace(/^www\./, '');
    } catch {
        prop_url = null;
    }
    if (prop_url && preLoaded[prop_url]) {
        Object.assign(websiteData, preLoaded[prop_url], { url });
        return websiteData;
    }

    // Fetch the page
    let response;
    try {
        response = await fetch(url, { method: 'GET', mode: 'cors', });
    } catch (e) {
        throw { url, error: 'Network error' };
    }

    if (!response.ok) throw { url, error: 'HTTP error', status: response.status };
    const rawDoc = await response.text();

    websiteData.url = response.url;
    const meta = parseMetaTags(rawDoc);
    const keys = Object.keys(meta);

    // Title
    let titleKey = META_TITLE.find(tag => keys.includes(tag));
    if (titleKey) websiteData.title = meta[titleKey];
    else {
        const title = extractTitle(rawDoc);
        if (title) websiteData.title = title;
    }

    // Description
    let descKey = META_DESCRIPTION.find(tag => keys.includes(tag));
    if (descKey) websiteData.description = meta[descKey];

    // Image
    for (const imageKey of META_IMAGES) {
        if (keys.includes(imageKey) && meta[imageKey]) {
            const url = complete(meta[imageKey], websiteData.url);
            try {
                const imgCheck = await fetch(url, { method: 'GET', mode: 'cors' });
                if (imgCheck.ok && imgCheck.headers.get('content-type').includes('image')) {
                    websiteData.iconLink = url;
                    break;
                }
            } catch {
                // just continue looking for a good image
            }
        }
    }
    if (!websiteData.iconLink) {
        const image = filterImageTag(rawDoc);
        if (image) websiteData.iconLink = complete(image, websiteData.url);
    }
    if (!websiteData.iconLink) {
        for (const imageKey of META_IMAGES_SECOND) {
            if (keys.includes(imageKey) && meta[imageKey]) {
                const url = complete(meta[imageKey], websiteData.url);
                try {
                    const imgCheck = await fetch(url, { method: 'GET', mode: 'cors' });
                    if (imgCheck.ok && imgCheck.headers.get('content-type').includes('image')) {
                        websiteData.iconLink = url;
                        break;
                    }
                } catch {
                    // just continue looking for a good image
                }
            }
        }
    }
    if (!websiteData.iconLink) {
        websiteData.iconLink = complete('/favicon.ico', websiteData.url);
    }


    // RSS
    let rssKey = META_RSS.find(tag => keys.includes(tag));
    if (rssKey) websiteData.rss = complete(meta[rssKey], websiteData.url);

    // Color
    let colorKey = META_COLOR.find(tag => keys.includes(tag));
    if (colorKey) websiteData.color = meta[colorKey];

    return websiteData;
} 