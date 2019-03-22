$(document).ready(function(){

   var $tileContainer = $("#tileContainer")

   var $preview_title = $('#preview_title')
   var $tileColor = $('#tileColor')
   var $preview_image = $('#preview_image')
   var $preview_container = $('#preview_container')
   var $definitelyAdd = $('#definitelyAdd')
   resetPreview()

    var typingTimer
    var doneTypingInterval = 500
    var $input = $('#new_website_link')

    var tile = {}

    $('#addModal').modal({
      ready: _ => $input.focus(),
      complete: _ => $input.blur()
    })

    chrome.topSites.get(function(data) {
      var topSites = {}
      var suggestions = {}
      $.each(data, (i, site) => {
        topSites[site.title] = site.url
        suggestions[site.title] = null
      })

      $input.autocomplete({
        data: suggestions,
        limit: 3,
        minLength: 2,
        onAutocomplete: val => $input
            .val(topSites[val])
            .trigger('input')
      })
    })

    $input
      .on('keyup', function (e) {

        // if "enter" was presed
        if(e.keyCode === 13 && !$definitelyAdd.hasClass('disabled')) return $definitelyAdd.click()

      })

    $input
      .on('input', function (e) {

        resetPreview()

        var input = $input.val().trim()
        if(input.length === 0) $input.removeClass('invalid')

        // lookup
        WebGlimpse
           .get(input)
           .then(info => {
console.log(info)
             if($input.val().trim() != info.input) return
             if(!info.title) info.title = info.input

             $input.removeClass('invalid')

             update({url: info.url, rss: info.rss})

             if(!info.icon) showText(info)
             else showIcon(info)

             $definitelyAdd.removeClass('disabled')

           })
           .catch((info) => {

             if($input.val().trim() != info.input) return
             if(input.length > 0) $input.addClass('invalid')
             resetPreview()

           })

      })
      .on('keydown', e => e.which !== 32 )



    var $picker = $('.color-picker')
    var $colorModal = $('#colorModal').modal()
    $tileColor.click(function() {
      $colorModal.modal('open')
      $picker.on('color', function(color) {
        $colorModal.modal('close')
        $picker.off('color')
        update({color: $picker.attr('color')})
      })
    })

    $definitelyAdd.click(function(){
      var tiles = JSON.parse(localStorage.getItem("tiles")) || []
      tiles.push(tile)
      localStorage.setItem("tiles", JSON.stringify(tiles))

      $tileContainer.trigger("addition")

      $('#addModal').modal('close')
      $input.val('')
      resetPreview()

    })

    function update(what) {
      if(what.title != undefined) {
        $preview_title.text( tile.title = what.title )
        tile.icon = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
      }
      if(what.icon != undefined) {
        $preview_image.attr("src", tile.icon = what.icon)
        $preview_title.text('')
      }
      if(what.color != undefined) {
          $preview_container.css("background-color", tile.color = what.color)
          $tileColor.css({display: 'block', background: what.color})

          var color = $tileColor.css('background-color').slice(4,-1).split(', ') // get as rgb
          var luma = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2] // per ITU-R BT.709
          $preview_title.css('color', luma < 40 ? '#fff': '#000')

      }
      if(what.url != undefined) tile.url = what.url
      if(what.rss != undefined) tile.rss = what.rss
    }

    function showText(info) {
      update({
        title: info.title,
        color: info.color || "#"+((1<<24)*Math.random()|0).toString(16)
      })
      $preview_image.attr("src", tile.icon)
    }

    function showIcon(info) {

      if(!info.icon) {
         $preview_image.off()
         showText(info)
        }

        update({
          title: info.title,
          icon: info.icon,
          color: info.color
        })

    }

    function resetPreview() {
      $preview_title.text('waiting...')
      $preview_title.css('color', '#fff')
      if($preview_image.attr("src") != 'img/loading.gif') $preview_image.attr("src", 'img/loading.gif') // http://imgur.com/gallery/Kb6sC93
      $preview_container.css("background-color", "#18191b")
      $definitelyAdd.addClass('disabled')
      $tileColor.css('display', 'none')
      tile = {}
    }

 })
