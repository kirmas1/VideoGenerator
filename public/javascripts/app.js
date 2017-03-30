var myApp = angular.module('videoAutomation', ['ngMaterial', 'ui.router', 'ngAnimate'])

.run(
  ['$rootScope', '$state', '$stateParams',
    function ($rootScope, $state, $stateParams) {

            // It's very handy to add references to $state and $stateParams to the $rootScope
            // so that you can access them from any scope within your applications.For example,
            // <li ng-class="{ active: $state.includes('contacts.list') }"> will set the <li>
            // to active whenever 'contacts.list' or one of its decendents is active.
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;
    }
  ]
)

.config(
  ['$stateProvider', '$urlRouterProvider', '$mdThemingProvider', function ($stateProvider, $urlRouterProvider, $mdThemingProvider) {

        ///Theme 
        $mdThemingProvider.theme('default')
            .primaryPalette('blue-grey', {
                'default': '500',
                'hue-1': '300',
                'hue-2': '800',
                'hue-3': '50'
            })
            // If you specify less than all of the keys, it will inherit from the
            // default shades
            .accentPalette('deep-purple', {
                'default': '500',
                'hue-1': '300',
                'hue-2': '800',
                'hue-3': 'A100'
            });

        // Use $urlRouterProvider to configure any redirects (when) and invalid urls (otherwise).
        $urlRouterProvider.otherwise('/manual');

        $stateProvider
            .state('manual', {
                abstract: true,
                url: '/manual',
                templateUrl: 'pages/manual.html',
                controller: 'manualCtrl'
            })
            .state('manual.instructions', {
                url: '',
                templateUrl: 'pages/manual.instructions.html'
            })
            .state('manual.imageDetails', {
                url: '/images/{id:[0-9]{1,4}}',
                templateUrl: 'pages/manual.image_slide_details.html',
                controller: 'imageDetailsController'
            })
            .state('manual.transitionDetails', {
                url: '/transitions/{id:[0-9]{1,4}}',
                templateUrl: 'pages/manual.transition_slide_details.html',
                controller: 'transitionDetailsController'
            })
            .state('automatic', {
                url: '/automatic',
                templateUrl: 'pages/automatic.html',
                controller: ['$scope', '$state',
                function ($scope, $state) {
                        console.log("state = automatic");
                }]
            })

  }]);

myApp.controller('mainNavCtrl', ['$scope', '$state', function ($scope, $state) {
    $scope.currentNavItem = 'Manual';
    $scope._goto = function (state) {
        console.log('mainNavCtrl acitve');
        $state.go(state);
    }
}]);


myApp.controller('manualCtrl', ['$scope', '$state', 'videoService', function ($scope, $state, videoService) {

    $scope.selectedIndex = null;
    var uploadClicks = 0;
    $scope.slides;

    $scope.$watch('selectedIndex', function (newValue, oldValue) {
        if (newValue != oldValue && newValue != null && oldValue == null)
            $scope.goToSlideDetails(newValue, 0);
    });

    $scope.goToSlideDetails = function (id, type) {
        $scope.selectedIndex = id;
        console.log('goToSlideDetails, type: ' + type);
        let state = type == 0 ? 'manual.imageDetails' : 'manual.transitionDetails';
        $state.go(state, {
            id: id
        });
    }

    $scope.uploadFile = function (event) {
        uploadClicks++;
        if (uploadClicks == 1)
            $scope.selectedIndex = 0;

        videoService.uploadEvenet(event).then(() => {
            $scope.slides = videoService.getSlides();
            console.log('back to ctrl, $scope.slides are: ' + $scope.slides);
            $scope.$digest();
        });


    }; //end of uploadFile 

}]);

myApp.controller('imageDetailsController', ['$scope', '$state', '$stateParams', 'videoService', function ($scope, $state, $stateParams, videoService) {

    $scope.item = videoService.getSlide($stateParams.id);
    
}])

myApp.controller('transitionDetailsController', ['$scope', '$state', '$stateParams', 'videoService', function ($scope, $state, $stateParams, videoService) {
    $scope.item = videoService.getSlide($stateParams.id);
}])

myApp.service('videoService', function () {
    var video = {
        name: 'unknown',
        slides: [] //slides includes transitions
    };

    var readAndPreview = function (file, index) {
        return new Promise((resolve, reject) => {
            // Make sure `file.name` matches our extensions criteria
            if (/\.(jpe?g|png|gif)$/i.test(file.name)) {

                var reader = new FileReader();

                reader.addEventListener("load", function () {
                    //push Image objects
                    video.slides.push({
                        type: 0, // 0 for image
                        fileName: file.name,
                        file: files[index],
                        caption: "",
                        thumbnail: this.result,
                        zoom: {
                            enabled: true,
                            style: 1 // 0-zoom to center. 1-zoom to random place near center
                        },
                        duration: 10
                    })
                    resolve();
                }, false);

                reader.readAsDataURL(file);

            } else reject('Not an image file');
        });

    };

    var saveAllFiles = function (files) {
        var ik = [];
        if (files) {
            for (let i = 0; i < files.length; i++) {
                ik.push(readAndPreview(files[i], i));
            }
            return Promise.all(ik);
        } else
            return Promise.reject('No Files');
    };

    var insertTransitionObjects = function () {
        for (let j = 0; j < video.slides.length - 1; j++) {
            if (video.slides[j].type == 0 && video.slides[j + 1].type == 0) {
                //Push (splice) Transition objects
                video.slides.splice(j + 1, 0, {
                    type: 1, // 1 for Blend
                    fileName: 'Transition',
                    thumbnail: 'images/transition.jpg',
                    duration:2,
                    effect:{
                        //0 - blend, 1 - uncover
                        type: "None",
                        uncover:null //0-left, 1-right, 2-down
                    }
                });
            }
        }
        return Promise.resolve;
    };

    var assignIds = function () {
        for (let i = 0; i < video.slides.length; i++) {
            video.slides[i].id = i;
        }
        return Promise.resolve();
    };

    var uploadEvenet = function (event) {
        return new Promise((resolve, reject) => {

            files = event.target.files;
            console.log('service uploadevent, files are: ' + files);

            saveAllFiles(files)
                .then(() => {
                    return insertTransitionObjects();
                })
                .then(() => {
                    return assignIds();
                })
                .then(() => {
                    console.log('service uploadevent, video.slides are: ' + video.slides);
                    resolve(0);
                });
        });

    };

    var getSlides = function () {
        return video.slides;
    };

    var getSlide = function (id) {
        return video.slides[id];
    }

    return {
        uploadEvenet: uploadEvenet,
        getSlides: getSlides,
        getSlide: getSlide
    };
})

myApp.directive('customOnChange', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeHandler = scope.$eval(attrs.customOnChange);
            element.bind('change', onChangeHandler);
        }
    };
});
