/*  Issues to solve:

    * Calculates wrong date at midnight due to diffrent days
    * Might want to switch back to cookies to support older
      versions of browsers (Just save the needed data)
    * REFACTOR. A lot of stuff can have their own functions
    * Make use of mouse events to manually move back
      and forward between forecasts?!
    * Should css code stay in or stand on it's own?
      Might wanna check on irc on that?
    * Version handling bitte!
    * New font? Gradiant text?
*/ 

;(function ($) {

  // Add / Override functionality

  Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
  }

  Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
  }

  Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
  }

  // Private functions

  var getForecastData = function(data) {
    var time = "",
        temp = "",
        precipitation = "", 
        symbol = "",
        bool = false,
        forecastData = [];

    $.each(data, function() {
      if(this.location.temperature) {
        temptime = this.from.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
        utcforecasttime = new Date(temptime[1],temptime[2]-1,
                          temptime[3],temptime[4]).addHours(
                            (new Date()).getHours() - 
                            (new Date().getUTCHours()));
        date = utcforecasttime.getDate() + "/" + 
               (utcforecasttime.getMonth() + 1);
        time = utcforecasttime.toString().match(/\d{2}:\d{2}/)[0];
        temp = this.location.temperature.value; 
        bool = true;
      }

      if(this.location.symbol && bool) {
        precipitation = this.location.precipitation.value;
        symbol = this.location.symbol.number;
        bool = false;
      }

      if (time !="" && temp !="" && symbol != "") {
        forecastData.push({
          date: date,
          time: time, 
          temp: temp,
          precipitation: precipitation,
          symbol: symbol
        });
        time, temp, precipitation, symbol = "";
      };
    });
    return forecastData;
  };

  var showForecast = function(data, current) {
    var counter = 0;

    $.each(data, function() {
      var html = $('<div/>').css({
        'position': 'absolute', 
        'top': '10px', 
        'left': '10px', 
        'right': '10px', 
        'bottom': '10px'
      }).appendTo(current);

      $('<div/>', {
        id: 'date' + counter, 
        text: this.date
      }).css({
        'color': 'black',
         'text-align': 'center',
        '-webkit-mask-image': '-webkit-gradient(linear, left top, left bottom, from(rgba(0,0,0,1)), to(rgba(0,0,0,0)))'
        }).appendTo(html);

      $('<div/>', {
        id: 'time' + counter, 
        text: this.time
      }).css({
        'color': 'blue',
         'text-align': 'right',
        '-webkit-mask-image': '-webkit-gradient(linear, left top, left bottom, from(rgba(0,0,0,1)), to(rgba(0,0,0,0)))'         
        }).appendTo(html);

      $('<div/>', { 
        id: 'temperature' + counter,
        html: this.temp + '&deg' + 'C' 
      }).css({
        'color': 'red',
         'text-align': 'right',
         '-webkit-mask-image': '-webkit-gradient(linear, left top, left bottom, from(rgba(0,0,0,1)), to(rgba(0,0,0,0)))'
        }).appendTo(html);

      $("#temperature" + counter).append($('<div/>', {
        id: 'precipitation', 
        text: this.precipitation + 'mm'
      }).css({
        'color': 'blue', 
        'text-align': 'left', 
        'position': 'relative',
        'float': 'left',
      }));

      src = 'http://api.yr.no/weatherapi/weathericon/1.0/?symbol=';
      if(parseInt(this.time) < 7) {
        src += this.symbol + ';is_night=1;content_type=image/png';
      } else   
        src += this.symbol + ';content_type=image/png';
      $('<img/>', {
        id: 'icon' + counter, 
        src: src
      }).css({
        'position': 'relative',
        'float': 'left',
        'top': '-55px'        
      }).appendTo(html);

      counter++;
    });
  };

  var timeCookie = function() {
   
    if($.cookie('simpleWeatherTime') == null) {
        $.cookie('simpleWeatherTime', new Date(), { expires: 1});
    } 
    return $.cookie('simpleWeatherTime');
  };

  var forecastData = function(settings) {
    var url = 'http://api.yr.no/weatherapi/locationforecast/1.8/?lat=' + 
                settings.latitude + ';lon=' + settings.longitude;

    $.ajax({
      type: "get",
      async: false,
      url: url,
      dataType: "xml",
      success: function(data) {
                localStorage.setObject('localForecastData', $.xml2json(data.responseText));
               },
      error: function(obj, msg) {
                console.log('error')
             }
    });
  };

  // Declare methods

  var methods = {

    init: function(options) {
      return this.each(function() {
        var $this = $(this),
            settings = $this.data('simpleWeather'),
            fdata,
            fd,
            UPDATEPERIOD = 60*60*1000;

        if(typeof(settings) == 'undefined') {

          var defauls = {

            latitude:  geoplugin_latitude(),
            longitude: geoplugin_longitude(),
            city:      geoplugin_city()

          }

          settings = $.extend({}, defauls, options);
          $this.data('simpleWeather', settings); 
        } else {
          settings = $.extend({}, options, settings);
        }

        now = new Date();

        if(((Date.parse(timeCookie()) + UPDATEPERIOD) < Date.parse(now)) || 
           !localStorage.getObject('localForecastData')) {
          $.cookie('simpleWeatherTime', null);  
          forecastData(settings);
          console.log('Forecast data loaded!');
        } 

        $('<div/>', { 
          id: 'slideshow',
          text: 'Simple Weather Plugin'
        }).css({
            'text-align': 'center',
            'font-family': 'Century Gothic, sans-serif',
            'margin': '5px auto',
            'position': 'relative', 
            'width': '100px', 
            'height': '50px',
            'padding': '10px', 
            'border-radius': '25px',
            '-webkit-box-shadow': '0px 0px 10px #000000',
            'box-shadow': '0px 0px 10px #000000',
            'background-clip': 'padding-box'
        }).appendTo($this);

        $('#slideshow').cssMap({
          'background': ['-moz-linear-gradient(top, #ffffff, #b3d7ff)', 
                           '-ms-linear-gradient(top, #ffffff 0%,#cbebff 47%,#b3d7ff 100%)',
                           '-o-linear-gradient(top, #ffffff 0%,#cbebff 47%,#b3d7ff 100%)',
                           '-webkit-linear-gradient(top, #ffffff 0%,#cbebff 47%,#b3d7ff 100%)',
                           '-webkit-gradient(linear, left top, left bottom, from(#ffffff), to(#b3d7ff)',
                           'linear-gradient(top, #ffffff 0%,#cbebff 47%,#b3d7ff 100%)'
                          ]
        });
      
        setTimeout(function () {
          $('#slideshow').text('');
          fd = localStorage.getObject('localForecastData');
          fdata = getForecastData(fd.product.time);
          showForecast(fdata, $('#slideshow', $this));
          $("#slideshow > div:gt(0)", $this).hide();

          setInterval(function() { 
            $('#slideshow > div:first', $this)
            .fadeOut(1000)
            .next()
            .fadeIn(1000)
            .end()
            .appendTo('#slideshow', $this);
          },  3000);
        }, 3000);

      });
    }
  };


  // Actual plugin

  $.fn.simpleWeather = function() {

    var method = arguments[0];

    if(methods[method]) {
      method = methods[method];
      arguments = Array.prototype.slice.call(arguments, 1);
    } else if(typeof(method) == 'object' || !method) {
      method = methods.init;
    } else {
      $.error('Method ' + method + 
        ' does not exist in jQuery.simpleWeather');
      return this;
    }

    return method.apply(this, arguments);
  }

})(jQuery); 

