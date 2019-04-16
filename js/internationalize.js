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
          translatePage("en", key);
        })
        .appendTo($selector);
    });

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
    }
  });
});
