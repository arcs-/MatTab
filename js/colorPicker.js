/*

	Bubble color picker
	By @Lewitje

	Have fun with it!

  https://codepen.io/Lewitje/pen/zqVaPY
 
*/

var colorPicker = (function () {

	var config = {
		baseColors: [
			[246, 64, 44],
			[156, 26, 177],
			[16, 147, 245],
			[70, 175, 74],
			[204, 221, 30],
			[255, 152, 0],
			[157, 157, 157]
		],
		lightModifier: 40,
		darkModifier: 0,
		transitionDuration: 200,
		transitionDelay: 25,
		variationTotal: 6
	};

	var state = {
		activeColor: [0, 0, 0]
	};

	function init() {

		$('input[type=color]').click(function (e) { e.preventDefault() })

		createColorPicker(function () {
			appendBaseColors();
		});

		addEventListeners();

		setFirstColorActive(function () {
			setFirstModifiedColorActive();
		});

		return $('.color-picker')
	}

	function setActiveBaseColor(el) {
		$('.color.active').removeClass('active');
		el.addClass('active');
	}

	function setActiveColor(el) {
		$('.color-var.active').removeClass('active');
		el.addClass('active');
		state.activeColor = el.data('color').split(',');
	}

	function addEventListeners() {
		$('body').on('click', '.color', function () {
			var color = $(this).data('color').split(',');
			setActiveBaseColor($(this));

			hideVariations(function () {
				createVariations(color, function () {
					setDelays(function () {
						showVariations();
					});
				});
			});
		});

		$('body').on('click', '.color-var', function () {
			setActiveColor($(this));
			$('.color-picker').attr('color', 'rgb(' + state.activeColor + ')')
			$('.color-picker').trigger('color')

		});
	}

	function setFirstColorActive(callback) {
		$('.color').eq(1).trigger('click');
		callback();
	}

	function setFirstModifiedColorActive() {
		setTimeout(function () {
			$('.color-var').eq(7).trigger('click');
		}, 500);
	}

	function createColorPicker(callback) {
		$('.color-picker').append('<div class="base-colors"></div>');
		$('.color-picker').append('<div class="varied-colors"></div>');
		$('.color-picker').append('<div class="active-color"></div>');
		$('.color-picker').append('<div class="color-history"></div>');

		callback();
	}

	function appendBaseColors() {
		for (i = 0; i < config.baseColors.length; i++) {
			$('.base-colors').append('<div class="color" data-color="' + config.baseColors[i].join() + '" style="background-color: rgb(' + config.baseColors[i].join() + ');"></div>');
		}
	};

	function createVariations(color, callback) {
		$('.varied-colors').html('');

		for (var i = 0; i < config.variationTotal; i++) {
			var newColor = [];

			for (var x = 0; x < color.length; x++) {
				var modifiedColor = (Number(color[x]) - 100) + (config.lightModifier * i);

				if (modifiedColor <= 0) {
					modifiedColor = 0;
				} else if (modifiedColor >= 255) {
					modifiedColor = 255;
				}

				newColor.push(modifiedColor);
			}

			$('.varied-colors').append('<div data-color="' + newColor + '" class="color-var" style="background-color: rgb(' + newColor + ');"></div>');
		}

		callback();
	}

	function setDelays(callback) {
		$('.color-var').each(function (x) {
			$(this).css({
				'transition': 'transform ' + (config.transitionDuration / 1000) + 's ' + ((config.transitionDelay / 1000) * x) + 's'
			});
		});

		callback();
	}

	function showVariations() {
		setTimeout(function () {
			$('.color-var').addClass('visible');
		}, (config.transitionDelay * config.variationTotal));
	}

	function hideVariations(callback) {
		$('.color-var').removeClass('visible').removeClass('active');

		setTimeout(function () {
			callback();
		}, (config.transitionDelay * config.variationTotal));
	}

	return {
		init: init
	};

}());
