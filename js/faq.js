$(function() {
  $.get('/faq.yaml').then(function(result) {
    // get yaml
    try {
      var sections = jsyaml.load(result);

      // render faq
      var $new = $('<div></div>');
      sections.map(function(section) {
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
                  $('<a target="_blank">').attr('href', paragraph).text(paragraph) :
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
      $new.appendTo($('.section.faq'));

    } catch (e) {
      console.error(e.name, ':', e.message);
      $('.faq-loading').text('Error');
    }
  });
});
