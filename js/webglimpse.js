/* WebGlimpse, (c) 2017 Patrick Stillhart
 * @license MIT */
(function(root, factory) {

  if (typeof define === 'function' && define.amd) define(factory)
  else if (typeof exports === 'object') module.exports = factory()
  else root.WebGlimpse = factory()

})(this, function() {

  var WebGlimpse = {}
  WebGlimpse.version = '0.0.1'


	const backgroundColorThief = new BackgroundColorTheif()

  /*
  Filter
  */
  var META_IMAGES = ['msapplication-square152x152logo', 'msapplication-tileimage', 'twitter:image', '196x196', '144x144', '96x96', 'thumbnail', 'primaryImageOfPage',
    'image_src', 'apple-touch-icon', 'og:image', '114x114', 'image/x-icon', 'apple-touch-icon-precomposed', 'fluid-icon',
    'previewIcon', 'msapplication-square32x32logo'
  ]
  var META_IMAGES_SECOND = ['shortcut icon', 'icon', '32x32']
  var FILTER_IMAGE_TAG = function(rawDoc) {
    let rawImage = rawDoc.match(/<img[^>]*>/g)
    if (rawImage)
      for (let img of rawImage) {
        let src = img.match(/src=['"]([^'"]*)['"]/)
        if (src && src[1].includes("logo")) return src[1]
      }
    return false
  }

  var META_TITLE = ['og:title', 'og:site_name', 'application-name', 'twitter:title', 'apple-mobile-web-app-title', 'mswebdialog-title']
  var META_COLOR = ['msapplication-tilecolor', 'msapplication-navbutton-color', 'theme-color']
  var META_RSS = ['application/rss+xml', 'application/atom+xml']
  var META_DESCRIPTION = ['og:description', 'descriptionl']

  /*
  PreLoaded
  */
  var preLoaded
  $.getJSON("data/pages.json", json => preLoaded = json)

  /*
  Public
  */
  WebGlimpse.get = url => new Promise((resolve, reject) => {

    var websiteData = {}
    websiteData.input = url

    if (!url.startsWith('http')) url = 'http://' + url.trim()
    websiteData.url = url

    var prop_url = stringToURL(url).hostname.replace('www.', '')
    if (preLoaded[prop_url]) return resolve(Object.assign(websiteData, preLoaded[prop_url]))

    var xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState != 4) return

      websiteData.url = url = xhr.responseURL

      if (xhr.status != 200) return reject(websiteData)

      var rawDoc = xhr.responseText
      if (!rawDoc) return reject(websiteData)

      let rawMeta = rawDoc.match(/(<meta[^>]*>)|(<link[^>]*>)/g)
      if (!rawMeta) return reject(websiteData)

      let meta = rawMeta.reduce((result, match) => {
        var $match = $(match)
        // size first for paypal 192x192(or like)
        var key = $match.attr('sizes') || $match.attr('rel') || $match.attr('name') || $match.attr('property') || $match.attr('type')
        var value = $match.attr('content') || $match.attr('href')
        if (key && value) result[key.toLowerCase()] = value

        return result
      }, {})

      let keys = Object.keys(meta)

      // get title
      let titleKey = META_TITLE.find(tag => keys.indexOf(tag) > -1)
      if (titleKey) websiteData.title = meta[titleKey]
      else {
        let title = rawDoc.match(/<title[^>]*>([\s\S]*?)<\/title>/)
        if (title) websiteData.title = title[1]
      }

      // get image
      var image
      if (image = META_IMAGES.find(tag => keys.indexOf(tag) > -1)) websiteData.iconLink = complete(meta[image], url)
      else if (image = FILTER_IMAGE_TAG(rawDoc)) websiteData.iconLink = complete(image, url)
      else if (image = META_IMAGES_SECOND.find(tag => keys.indexOf(tag) > -1)) websiteData.iconLink = complete(meta[image], url)

      // get rss
      let rssKey = META_RSS.find(tag => keys.indexOf(tag) > -1)
      if (rssKey) websiteData.rss = complete(meta[rssKey], url)

			// get color
			let colorKey = META_COLOR.find(tag => keys.indexOf(tag) > -1)
			if (colorKey) websiteData.color = meta[colorKey]
			// if no color, find one based on image

			if(!websiteData.iconLink) websiteData.iconLink = websiteData.url + "favicon.png"

      loadImage(websiteData.iconLink, websiteData.color)
        .then(res => {

  				websiteData.icon = res.image
  				if(res.color) websiteData.color = res.color
  				resolve(websiteData)

  			})
        .catch(_ => {

          websiteData.iconLink = undefined
          resolve(websiteData)

        })


    }
    xhr.open("GET", url, true)
    xhr.send()

  })

  /*
  Private
  */

  // from https://stackoverflow.com/a/12965135/3137109
  function complete(url, base_url) {
    if (url.indexOf(';base64') > -1) return url

    var doc = document,
      old_base = doc.getElementsByTagName('base')[0],
      old_href = old_base && old_base.href,
      doc_head = doc.head || doc.getElementsByTagName('head')[0],
      our_base = old_base || doc_head.appendChild(doc.createElement('base')),
      resolver = doc.createElement('a'),
      resolved_url

    our_base.href = base_url || ''
    resolver.href = url
    resolved_url = resolver.href // browser magic at work here

    if (old_base) old_base.href = old_href
    else doc_head.removeChild(our_base)
    return resolved_url
  }

  function stringToURL(stringURL) {
    var aElement = document.createElement('a')
    aElement.href = stringURL
    return aElement.cloneNode(false)
  }

  // color stuff

  function loadImage(imageLink, color, cb) {
    return new Promise((resolve, reject) => {

      const img = new Image

      img.onload = function() {

        const canvas = document.createElement('canvas')
        canvas.width = this.naturalWidth
        canvas.height = this.naturalHeight

        document.body.append(canvas)

        const ctx = canvas.getContext('2d')
        ctx.drawImage(this, 0, 0)

  			const iconAsString = canvas.toDataURL("image/png", "")

  			// look for a color
        const borderC = getBorderColor(ctx)
        if (borderC) var foundColor = borderC
  			else if(color) var foundColor = color
        else var foundColor = getAverageColor(this)

        resolve({image: iconAsString, color: foundColor})

      }

      img.onerror = reject

      img.src = imageLink

    })
  }


  function getAverageColor(image) {
    try {
      var lightness = (c, n) => c.map(d => (d += n) < 0 ? 0 : d > 255 ? 255 : d | 0)
      var rgb = backgroundColorThief.getBackGroundColor(image)
      return color = 'rgb(' + lightness(rgb, 30).join(',') + ')'
    } catch (e) {
      console.error(e)
      return null
    }
  }

  function getBorderColor(ctx) {

    var width = ctx.canvas.width - 1
    var height = ctx.canvas.height - 1

    var colors = {}

    var deduce = function(arr) {
      for (var i = 0; i < arr.length; i += 4) {

        if (arr[i + 3] < 1) var address = 'alpha'
        else var address = `${arr[i]},${arr[i+1]},${arr[i+2]}`

        var val = colors[address]
        colors[address] = val == undefined ? 0 : val + 1

      }
    }

    deduce(ctx.getImageData(0, 0, width, 1).data)
    deduce(ctx.getImageData(width, 0, 1, height).data)
    deduce(ctx.getImageData(0, 0, 1, height).data)
    deduce(ctx.getImageData(0, height, width, 1).data)

    var topColor, topCount = 0
    for (var color in colors) {
      if (colors[color] > topCount) topCount = colors[topColor = color]
    }
    if (topColor === 'alpha') return false;

    return `rgb(${topColor})`

  }


  /*
  done
  */

  return WebGlimpse

})
