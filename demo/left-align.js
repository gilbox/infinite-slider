app = angular.module('myApp', ['gilbox.infiniteSlider']);

app.controller('appCtrl', function($scope) {

  var imgs = [
    {
      img: 'http://farm4.staticflickr.com/3455/3372925208_e1f2aae4e3.jpg',
      link: 'http://flic.kr/p/69489U'
    },
    {
      img: 'http://farm9.staticflickr.com/8280/8711378816_39cc228e5c.jpg',
      link: 'http://flic.kr/p/egN6qu'
    },
    {
      img: 'http://farm4.staticflickr.com/3666/12679059445_0bac555ecf.jpg',
      link: 'http://flic.kr/p/kjpuDc'
    }
  ];

  $scope.listData = {
    items: imgs
  };

});