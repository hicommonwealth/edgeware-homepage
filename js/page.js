$(function() {
  var hash = window.location.hash.replace(/^#/, '');

  //
  // NAV
  //
  $(function() {
    $('html').on('click', function(e) {
      var target = $(e.target);
      if (target.closest('.header-links-hamburger').length > 0) return;
      $('#menuToggle input[type="checkbox"]').prop('checked', false);
    });
  });

  //
  // GENERAL I18N
  //
  $.get('/i18n/languages.yaml').then(function(languagesText) {
    var languages = jsyaml.load(languagesText);

    // load dictionaries
    Promise.all(
      languages.map(function(code) { return $.get('/i18n/' + code + '.yaml'); })
    ).then(function (results) {
      var dictionaries = {};
      try {
        languages.map(function(code, index) {
          dictionaries[code] = jsyaml.load(results[index]);
        });
      } catch (e) {
        console.error(e.name, ':', e.message);
      }

      // render language pickers in the menu
      var $selector = $('.i18n-selector');
      Object.keys(dictionaries).map(function(key) {
        $('<a href="#"></a>')
          .text(key.toUpperCase())
          .click(function(e) {
            e.preventDefault();
            if (history.pushState) {
              history.pushState(null, null, '#' + key);
            } else {
              location.hash = '#' + key;
            }
            hash = key;
            translatePage('en', key);
          })
          .appendTo($selector);
      });

      // translate the page on load, if a language is selected
      if (hash && dictionaries[hash]) {
        translatePage('en', hash);
      }

      // find all DOM elements on the page with .i18n class, and translate them
      function translatePage(fromLang, toLang) {
        var reverse = {};
        Object.keys(dictionaries[fromLang]).map(function(key) {
          reverse[dictionaries[fromLang][key].trim()] = key;
        });

        $('.i18n').map(function(index, elem) {
          // replace any instances of multiple whitespace with a single space,
          // and then look up the text in the translation dictionary
          var $elem = $(elem);
          if (!$elem.data('i18n-key')) {
            var text = $elem.text().replace(/[\n\ ]+/g, ' ').trim();
            $elem.data('i18n-key', reverse[text]);
            $elem.text(dictionaries[toLang][reverse[text]]);
          } else {
            $elem.text(dictionaries[toLang][$elem.data('i18n-key')]);
          }
        });

        // Find DOM Elements with .wp class and switch out href to correct link
        $('.wp').attr('href', dictionaries[toLang]['wplink']);
        console.log(dictionaries[toLang]['wplink']);

        if ($('.section.faq').length > 0) renderFAQ(faqs[hash || 'en']);
      }
    });
  });

  //
  // FAQ
  //
  var faqs;
  if ($('.section.faq').length > 0) {
    $.get('../faq.yaml').then(function(result) {
      faqs = jsyaml.load(result);
      renderFAQ(faqs[hash || 'en']);
    }).catch(function(err) {
      console.error(err);
    });
  }

  function renderFAQ(faq) {
    try {
      // render faq
      var $new = $('<div></div>');
      faq.map(function(section) {
        var title = section.section;
        var items = section.items;
        var $header = $('<h2>' + title + '</h2>');
        var $items = $('<div class="items clearfix"></div>');
        items.map(function(item) {
          $('<div class="item">').append(
            $('<h3>').text(item.question),
            $('<div class="item-body">').append(
              item.answer.split('\n\n').map(function(paragraph) {
                return (paragraph.startsWith('http://') || paragraph.startsWith('https://')) ?
                  $('<p>').append($('<a target="_blank">').attr('href', paragraph).text(paragraph)) :
                  $('<p>').text(paragraph);
              })
            ),
          ).appendTo($items);
        });
        $new.append($header);
        $new.append($items);
      });

      // push into document
      $('.faq-loading').remove();
      $('.section.faq').empty();
      $new.appendTo($('.section.faq'));

    } catch (e) {
      console.error(e.name, ':', e.message);
      $('.faq-loading').text('Error');
    }
  }

  var devs;
  if ($('.section.dev').length > 0) {
    $.get('/dev.yaml').then(function(result) {
      devs = jsyaml.load(result);
      renderDev(devs[hash || 'en']);
    }).catch(function(err) {
      console.error(err);
    });
  }

  function renderDev(dev) {
    try {
      // render faq
      var $new = $('<div></div>');
      dev.map(function(section) {
        var title = section.section;
        var items = section.items;
        var $header = $('<h2>' + title + '</h2>');
        var $items = $('<div class="items clearfix"></div>');
        items.map(function(item) {
          $('<div class="item">').append(
            $('<h3>').text(item.question),
            $('<div class="item-body">').append(
              item.answer.split('\n\n').map(function(paragraph) {
                return (paragraph.startsWith('http://') || paragraph.startsWith('https://')) ?
                  $('<p>').append($('<a target="_blank">').attr('href', paragraph).text(paragraph)) :
                  $('<p>').text(paragraph);
              })
            ),
          ).appendTo($items);
        });
        $new.append($header);
        $new.append($items);
      });

      // push into document
      $('.dev-loading').remove();
      $('.section.dev').empty();
      $new.appendTo($('.section.dev'));

    } catch (e) {
      console.error(e.name, ':', e.message);
      $('.dev-loading').text('Error');
    }
  }

  var presses;
  if ($('.section.press').length > 0) {
    $.get('/press.yaml').then(function(result) {
      presses = jsyaml.load(result);
      renderPress(presses[hash || 'en']);
    }).catch(function(err) {
      console.error(err);
    });
  }

  function renderPress(press) {
    try {
      // render faq
      var $new = $('<div></div>');
      press.map(function(section) {
        var title = section.section;
        var items = section.items;
        var $header = $('<h2>' + title + '</h2>');
        var $items = $('<div class="items clearfix"></div>');
        items.map(function(item) {
          $('<div class="item">').append(
            $('<h3>').text(item.question),
            $('<div class="item-body">').append(
              item.answer.split('\n\n').map(function(paragraph) {
                return (paragraph.startsWith('http://') || paragraph.startsWith('https://')) ?
                  $('<p>').append($('<a target="_blank">').attr('href', paragraph).text(paragraph)) :
                  $('<p>').text(paragraph);
              })
            ),
          ).appendTo($items);
        });
        $new.append($header);
        $new.append($items);
      });

      // push into document
      $('.press-loading').remove();
      $('.section.press').empty();
      $new.appendTo($('.section.press'));

    } catch (e) {
      console.error(e.name, ':', e.message);
      $('.press-loading').text('Error');
    }
  }
});
