$(document).ready(function() {

	var $tileContainer = $("#tileContainer")
	$tileContainer.on("addition", load)
	var $template = $("#template")

	/*
	Background stuff
	*/
	var currentBackground

	if (localStorage.getItem("useUnplash") === "true" &&
		localStorage.getItem("useBgImage") === "true") {

		var oldDate = new Date(localStorage.getItem("lastUpdate") * 1).getTime()
		var nowDate = new Date().getTime()

		if (oldDate + 1000 * 60 * 60 < nowDate) {

			fetch(`https://unsplash.it/${screen.width}/${screen.height}/?random`) // "https://unsplash.it/1920/1080/?random"
				.then(response => response.blob())
				.then(blob => new Promise((resolve, reject) => {

					if (!blob || blob.size == 0 || blob.type == 'text/html') return reject("no background response")

					const reader = new FileReader
					reader.onloadend = () => resolve(reader.result)
					reader.onerror = reject
					reader.readAsDataURL(blob)

				}))
				.then(image => {
					localStorage.setItem("bgImage", image)
					localStorage.setItem("lastUpdate", nowDate)
					localStorage.setItem("bgPath", "")
				})
				.catch(console.error)

		}
	}

	/*
 	first time use
	*/

	if (!localStorage.getItem("init")) {
		localStorage.setItem("init", true)
		localStorage.setItem("bgColor", "#616161")
		//localStorage.setItem("bgImage", "img/bg.png") // http://creativecrunk.com/material-design-backgrounds/
		localStorage.setItem("useBgImage", true)
		localStorage.setItem("loadFeeds", false)
		updateBg()

		chrome.topSites.get(function(data) {

			// sneaky
			data.push({title:"Patrick",	url: "https://stillh.art/"})

      $.each(data, (i, site) => {

				WebGlimpse.get(site.url)
					 .then(info => {

						 var tiles = JSON.parse(localStorage.getItem("tiles")) || []
			       tiles.push(info)
			       localStorage.setItem("tiles", JSON.stringify(tiles))

			       load()

					 })

      })

    })


	} else {
		updateBg()
		load()
	}

	/*
	load tiles
	*/

	function load() {

		$tileContainer.empty()
		// also remove tool tips
		$('.material-tooltip').remove()

		var tiles = JSON.parse(localStorage.getItem("tiles")) || []
		var clean = false
		var feedCounter = 0
		tiles.forEach((tile, index) => {

			// should not happen
			if (!tile) return clean = true

			var $container = $template
				.clone()
				.css('display', '')
				.removeAttr('id')

			/*
				-> background
			*/
			var color = $container
				.find('.card')
				.first()
				.css("background-color", tile.color)
				.css('background-color')
				.slice(4, -1)
				.split(', ') // get as rgb

			var luma = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2] // per ITU-R BT.709

			/*
 				-> title
			*/
			if (!tile.icon || tile.icon == "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") $container
				.find('.template-title')
				.first()
				.text(tile.title)
				.css('color', luma < 130 ? '#fff' : '#000')

			/*
	 			-> icon
			*/
			$container.find('.template-icon').first().attr("src", tile.icon || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")

			/*
				-> link
			*/
			$container.find('.template-link').first().attr("href", tile.url)

			/*
				-> tooltip
			*/
			if (tile.title) $container.find('.template-card').first().tooltip({ delay: 1000, tooltip: tile.title })

			/*
				-> feed
			*/
			if (localStorage.getItem("loadFeeds") === "true") setTimeout(function() {
				$.getFeed({
					url: tile.rss,
					success: function(feed) {

						if (feed.items.length === 0) return

						var feedContainer = $container.find('.template-rss').first()
						for (var i = 0; i < Math.min(feed.items.length, 7); i++) {
							feedContainer
								.append(`<a href="${feed.items[i].link}"><p>${feed.items[i].title}</p></a>`)
						}

						$container
							.find('.card-reveal')
							.css({ display: 'block' })
							.velocity("stop", false)
							.velocity({ translateY: '-100%' }, { duration: 300, queue: false, easing: 'easeInOutQuad' })

					}
				})
			}, 300 * ++feedCounter + 1000)

			$container.appendTo($tileContainer)

		})

		if (clean) localStorage.setItem("tiles", JSON.stringify(tiles.filter(t => t !== null)))

	}

	// fix for dragging tiles into the nav bar
	//

	$('body').bind("dragleave", function(evt) {
    if (evt.originalEvent.clientX || evt.originalEvent.clientY) return
    window.leftWindow = true

		evt.type = 'dragend'
		mainTiles.handleEvent.call(mainTiles, evt)

 	})

	var mainTiles = Sortable.create($tileContainer[0], {
		group: 'tiles',
		draggable: ".movable",
		animation: 300,

		setData: function (dataTransfer, dragEl) {
			dataTransfer.setData('url', dragEl.firstElementChild.firstElementChild.href)
		},

		onStart: function(evt) {
			$('#addButton')
				.html('delete')
				.parent()
				.addClass('pulse')
		},

		onEnd: function(evt) {

			if(window.leftWindow){
				window.leftWindow = false

				var itemToReset = mainTiles.el.children[ evt.newIndex ]
				var originalPosition = mainTiles.el.children[ evt.oldIndex ]
		 		var	nextSiblingOriginal = mainTiles.el.children[ evt.oldIndex  + (evt.oldIndex > evt.newIndex ? 1 : 0) ]

 	 			mainTiles.el.insertBefore(itemToReset, nextSiblingOriginal)
				mainTiles._animate( originalPosition , itemToReset)

			} else if(evt.item.parentNode.id == $tileContainer[0].id) {

				var tiles = JSON.parse(localStorage.getItem("tiles")) || []
				tiles.move(evt.oldIndex, evt.newIndex)
				localStorage.setItem("tiles", JSON.stringify(tiles))

			}

			$('#addButton')
				.find('.template-card')
				.first()
				.tooltip('remove')

			$('#addButton')
				.html('add')
				.parent()
				.removeClass('pulse')

		}

	})

	/*
		trash
	*/

	Sortable.create($('#addButton')[0], {
		group: 'tiles',
		draggable: ".movable",

		onAdd: function(e) {

			var tiles = JSON.parse(localStorage.getItem("tiles"))
			tiles.splice(e.oldIndex, 1)
			localStorage.setItem("tiles", JSON.stringify(tiles))

			Materialize.toast('Tile removed!', 1000)

		}
	})

	/* apps */
	$('#appsLink').click(function() { chrome.tabs.create({ url: 'chrome://apps/' }) })

	/*
------------------------------------
	settings
------------------------------------
	 */

	$('#settingsModal').modal({
		complete: function() { $('#bgColor').css('background', localStorage.getItem("bgImage")) }
	})

	$('#export').click(function() {

		let values = {}
		for (var i = 0, len = localStorage.length; i < len; ++i) {
			values[localStorage.key(i)] = localStorage.getItem(localStorage.key(i))
		}

		let a = document.createElement("a")
		let file = new Blob([JSON.stringify(values)], { type: 'text/plain' })
		a.href = URL.createObjectURL(file)
		a.download = 'MatTab-Settings.json'
		a.click()

	})

	$('#import').change(function() {
		let file = $(this)[0].files[0]
		if (!file) return

		let fr = new FileReader
		fr.onload = function() {
			let json = JSON.parse(fr.result)
			for (var key in json) localStorage.setItem(key, json[key])
			location.reload()
		}
		fr.readAsText(file)

	})

	if (localStorage.getItem("loadFeeds") === "true") $('#loadFeeds').prop('checked', true)

	$('#bgColor').css('background', localStorage.getItem("bgColor"))

	if (localStorage.getItem("useBgImage") === "true") $('#useBgImage').prop('checked', true)
	if (localStorage.getItem("useUnplash") === "true") $('#useUnplash').prop('checked', true)
	$('#bgPath').val(localStorage.getItem("bgPath"))


	// color picker
	var $colorModal = $('#colorModal').modal()
	var $picker = colorPicker.init()
	$('#bgColor').click(function() {
		$colorModal.modal('open')
		$picker.on('color', function(color) {
			$colorModal.modal('close')
			var color = $picker.attr('color')
			localStorage.setItem("bgColor", color)
			$('#bgColor').css('background', color)
			updateBg()

			$picker.off('color')
		})
	})

	InputDependency.index()

})

$('#bgFile').change(function(e) {
	if (this.files && this.files[0]) {
		var reader = new FileReader()
		reader.onload = function(e) {
			localStorage.setItem("bgImage", e.target.result)
			localStorage.setItem("bgPath", $('#bgPath').val())
			updateBg()
		}
		reader.readAsDataURL(this.files[0])
	} else {
		localStorage.setItem("bgImage", '')
		localStorage.setItem("bgPath", '')
		updateBg()
	}
})

$('#useBgImage').change(function() {
	localStorage.setItem("useBgImage", this.checked)
	updateBg()
})

$('#useUnplash').change(function() {
	localStorage.setItem("useUnplash", this.checked)
	localStorage.setItem("lastUpdate", 0)
	updateBg()
})

$('#loadFeeds').change(function() {localStorage.setItem("loadFeeds", this.checked)})

//$('#download').click(function() {this.href = currentBackground})

/*
	Helper
*/
function updateBg() {
	if (localStorage.getItem("useBgImage") != "true") return $('body').css('background', localStorage.getItem("bgColor"))

	if(localStorage.getItem("bgPath")) $('#credit').hide()
	else if(localStorage.getItem("bgImage")) {
		$('#credit').show()
		$('#credit').attr("href", 'https://picsum.photos/')
		$('#credit .author').text('Lorem Picsum')
	}

	let bg = localStorage.getItem("bgImage") || "img/bg.png"
	$('body').css('background', 'url(' + bg + ') no-repeat center center fixed')

}

/*
	polyfill
*/
Array.prototype.move = function(old_index, new_index) {
	if (new_index >= this.length) {
		var k = new_index - this.length
		while ((k--) + 1) this.push(undefined)
	}
	this.splice(new_index, 0, this.splice(old_index, 1)[0])
	return this
}
