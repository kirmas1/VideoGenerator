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
        $urlRouterProvider.otherwise('/automatic');

        $stateProvider
            .state('manual', {
                abstract: true,
                url: '/manual',
                views: {
                    '': {
                        templateUrl: 'pages/manual.html',
                        controller: 'manualCtrl'
                    },
                    'videosHistory@': {
                        templateUrl: 'pages/videosHistory.html',
                        controller: 'videosHistoryCtrl'
                    }
                }
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
                views: {
                    '': {
                        templateUrl: 'pages/automatic.html',
                        controller: 'automaticCtrl'
                    },
                    'videosHistory@': {
                        templateUrl: 'pages/videosHistory.html',
                        controller: 'videosHistoryCtrl'
                    }
                }
            })
  }]);

myApp.controller('mainNavCtrl', ['$scope', '$state', function ($scope, $state) {
    $scope.currentNavItem = 'Automatic';
    $scope._goto = function (state) {
        console.log('mainNavCtrl acitve');
        $state.go(state);
    }
}]);

myApp.controller('videosHistoryCtrl', ['$scope', '$state', '$mdDialog', 'videoService', function ($scope, $state, $mdDialog, videoService) {

    $scope.videoHistoryList = videoService.getVideoHistoryList();

    $scope.playVideo = function (ev, index) {
        console.log('ev: ' + ev);
        $mdDialog.index = index;
        $mdDialog.show({
                controller: VideoDialogController,
                templateUrl: 'pages/videodialog.html',
                //parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
            })
            .then(function (answer) {}, function () {});
    };

    function VideoDialogController($scope, $mdDialog) {
        $scope.video_src = videoService.getLink($mdDialog.index);
        $scope.closeDialog = function () {
            $mdDialog.hide();
        }
        $scope.cancel = function () {
            $mdDialog.cancel();
        };
    }

}]);

myApp.controller('automaticCtrl', ['$scope', '$q', 'videoService', function ($scope, $q, videoService) {
    console.log(`automaticCtrl`);

    $scope.searchText = '';

    // list of `state` value/display objects
    $scope.phrases = loadAll();

    $scope.generateAutomaticVideo = function () {

        console.log(`automaticCtrl::genrateAutomaticVideo::search  = ${$scope.searchText}`);

        if ($scope.searchText) videoService.generateAutomaticVideo($scope.searchText);
        $scope.searchText = '';

    }

    $scope.querySearch = function (query) {
        var results = query ? $scope.phrases.filter(createFilterFor(query)) : $scope.phrases;
        //console.log('-----------results are:' + results);
        return results.slice(0, 3);
    }

    $scope.searchTextChange = function (text) {
        console.log('Text changed to ' + text);
    }

    function loadAll() {
        var allOptionalPhrases =
            'BMW, Audi, Porsche, Lamborghini, Dodge, McLaren, Mercedes-Benz, Bentley, Nissan, Chevrolet, BMW 7 Series, BMW M4, Audi TTS, Audi A8,   Porsche 918 Spyder, Lamborghini Aventador, Dodge Challenger, Dodge Charger, McLaren 650S Coupe, McLaren 650S Spider, Mercedes-Benz S-Class, Mercedes-Benz SL-Class, Bentley Flying Spur, Lamborghini Huracan, Nissan GT-R, Chevrolet Camaro, Porsche Panamera, BMW 7 Series 2016, BMW 7 Series 2017, BMW M4 2017, Audi TTS 2017, Audi A8 2017, Porsche 918 Spyder 2016, Lamborghini Aventador 2017, Dodge Challenger 2016, Dodge Charger 2016, McLaren 650S Coupe 2016, McLaren 650S Spider 2017, Mercedes-Benz S-Class 2016, Mercedes-Benz SL-Class 2016, Bentley Flying Spur 2017, Lamborghini Huracan 2017,Nissan	GT-R 2016, Chevrolet Camaro 2017, Porsche Panamera 2017, Porsche Panamera 2016';


        return allOptionalPhrases.split(/, +/g).map(function (phrase_option) {
            return {
                value: phrase_option.toLowerCase(),
                display: phrase_option
            };
        });

        //        var allStates = 'Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware,\
        //              Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana,\
        //              Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana,\
        //              Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina,\
        //              North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina,\
        //              South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia,\
        //              Wisconsin, Wyoming';
        //
        //        return allStates.split(/, +/g).map(function (state) {
        //            return {
        //                value: state.toLowerCase(),
        //                display: state
        //            };
        //        });
    }

    /**
     * Create filter function for a query string
     */
    function createFilterFor(query) {
        var lowercaseQuery = angular.lowercase(query);

        return function filterFn(state) {
            return (state.value.indexOf(lowercaseQuery) === 0);
        };

    }

    //////////////////////////
    ////////////////////////
}]);


myApp.controller('manualCtrl', ['$scope', '$state', '$timeout', '$mdDialog', 'videoService', function ($scope, $state, $timeout, $mdDialog, videoService) {

    $scope.selectedIndex = null;
    var uploadClicks = 0;
    $scope.slides = videoService.getSlides();

    $scope.$watch('selectedIndex', function (newValue, oldValue) {
        if (newValue != oldValue && newValue != null && oldValue == null) {
            console.log('Ohh ohhhhh');
            $scope.goToSlideDetails(newValue, 0);
        }

    });

    $scope.goToSlideDetails = function (id, type) {
        $scope.selectedIndex = id;
        let state = type == 0 ? 'manual.imageDetails' : 'manual.transitionDetails';
        $state.go(state, {
            id: id
        });
    }

    $scope.clearList = function () {
        videoService.clearSlidesList();
        console.log($scope.slides);
        $scope.slides = [];
        $state.go('manual.instructions');
    }

    $scope.uploadFile = function (event) {
        uploadClicks++;
        //        if (uploadClicks == 1)
        //            $scope.selectedIndex = 0;
        if ($scope.slides.length == 0)
            $scope.selectedIndex = 0;
        videoService.uploadEvenet(event).then(() => {
            $scope.slides = videoService.getSlides();
            $scope.$digest();
        });

    }; //end of uploadFile 

    $scope.removeItem = function (index) {
        $timeout(() => {
            //Removing from end of the list
            if (index == $scope.slides.length - 1) {
                if ($scope.selectedIndex == index || $scope.selectedIndex == index - 1)
                    $scope.selectedIndex = index - 2;
                $scope.slides.splice(index - 1, 2);
                $scope.goToSlideDetails(index - 2, 0);
            }
            //Removing from middle or first
            else {
                $scope.slides.splice(index, 2);
                if ($scope.selectedIndex == index || $scope.selectedIndex == index + 1)
                    $scope.goToSlideDetails(index, 0);
            }
            //Removing last one
            if ($scope.slides.length == 0)
                $scope.selectedIndex = null;
        }, 300);

    }

    $scope.moveUpItem = function (index) {
        $timeout(() => {
            swipe(index, index - 2);
            if ($scope.selectedIndex == index) {
                $scope.selectedIndex = index - 2;
                $scope.goToSlideDetails(index - 2, 0);
            } else if ($scope.selectedIndex == index - 2) {
                $scope.selectedIndex += 2;
                $scope.goToSlideDetails(index, 0);
            }
        }, 500);

    }

    $scope.moveDownItem = function (index) {
        $timeout(() => {
            swipe(index, index + 2);
            if ($scope.selectedIndex == index) {
                $scope.selectedIndex = index + 2;
                $scope.goToSlideDetails(index + 2, 0);
            } else if ($scope.selectedIndex == index + 2) {
                $scope.selectedIndex -= 2;
                $scope.goToSlideDetails(index, 0);
            }
        }, 300);

    }

    var swipe = function (origin, dest) {
        var temp = $scope.slides[dest];
        $scope.slides[dest] = $scope.slides[origin];
        $scope.slides[origin] = temp;
    }

    $scope.genrateVideo = function () {
        videoService.generateVideo();
    }

    $scope.showConfirmGenerateVideo = function (ev) {
        // Appending dialog to document.body to cover sidenav in docs app
        var confirm = $mdDialog.confirm()
            .title('Would you like to generate the video now?')
            .textContent('Please make sure you set all your preferences.')
            .ariaLabel('Lucky day')
            .targetEvent(ev)
            .ok('Please do it!')
            .cancel('Let me check again');

        $mdDialog.show(confirm).then(function () {
            videoService.generateVideo();
        }, function () {
            //dismiss
        });
    };

}]);

myApp.controller('imageDetailsController', ['$scope', '$state', '$stateParams', 'videoService', function ($scope, $state, $stateParams, videoService) {

    $scope.fontSizeList = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
    $scope.fontList = ['Arial', 'Calibri', 'Cambria', 'Comic Sans MS', 'Georgia', 'Open Sans', 'Times New Roman'];

    $scope.item = videoService.getSlide($stateParams.id);

}])

myApp.controller('transitionDetailsController', ['$scope', '$state', '$stateParams', 'videoService', function ($scope, $state, $stateParams, videoService) {

    $scope.item = videoService.getSlide($stateParams.id);

    $scope.id = $stateParams.id / 2 + 1 / 2;
}])

myApp.factory('videoService', ['$rootScope', function ($rootScope) {

    var socket = io.connect('http://localhost:3000');
    
    socket.on('connection approved', function (data) {
        console.log('connection approved ' + data);
    });

    socket.on('update', function (data) {
        //TODO 
        historyList[historyList.length -1].inProgress = false;
        historyList[historyList.length -1].state = data.state;
        historyList[historyList.length -1].link = data.link
        console.log('update, ' + data);
    });


    var video = {
        files: [],
        name: 'Video Name here',
        slides: [] //slides includes transitions
    };

    /*
    Each object in this list should contain:
    videoName, date, link, inProgress (T/F)
    */
    var historyList = [];

    var getVideoHistoryList = function () {
        return historyList;
    }

    var getLink = function (index) {
        return historyList[index].link;
    }

    var clearSlidesList = function () {
        video.slides = [];
    }

    var readAndPreview = function (file, index) {
        return new Promise((resolve, reject) => {
            // Make sure `file.name` matches our extensions criteria
            if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
                console.log('fileNmae is: ' + file.name);
                console.log('-------');
                var reader = new FileReader();

                reader.addEventListener("load", function () {
                    //push Image objects
                    video.slides.push({
                        type: 0, // 0 for image
                        fileName: file.name,
                        //                        file: files[index],
                        caption: {
                            text: "",
                            font: "Arial",
                            fontsize: 11,
                            bold: false,
                            italic: false,
                            effect: 0, // 0 - None, 1 - Sliding Right, 2 - FadeInOit
                            startTime: 0,
                            duration: 0
                        },
                        thumbnail: this.result,
                        zoom: {
                            enabled: true,
                            style: 1 // 0-zoom to center. 1-zoom to random place near center
                        },
                        duration: 10
                    })
                    video.files.push(files[index]);
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
                    duration: 2,
                    effect: {
                        //0 - blend, 1 - uncover
                        type: 0,
                        uncover: null //0-left, 1-right, 2-down
                    }
                });
            }
        }
        return Promise.resolve;
    };

    var uploadEvenet = function (event) {
        return new Promise((resolve, reject) => {

            files = event.target.files;

            saveAllFiles(files)
                .then(() => {
                    return insertTransitionObjects();
                })
                .then(() => {
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

    var formatDate = function (date) {
        var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
        ];

        var day = date.getDate();
        var monthIndex = date.getMonth();
        var year = date.getFullYear();

        return day + ' ' + monthNames[monthIndex] + ' ' + year;
    }

    var generateAutomaticVideo = function (phrase) {
        console.log('videoService::generateAutomaticVideo:: phrase = ' + phrase);
        var m_index = historyList.push({
            videoName: phrase,
            date: formatDate(new Date()),
            link: '',
            inProgress: true,
            id: '',
            state: -1 // -1 - Init, 0 - InProgress, 1 - Ready, 2 - Failed
        }) - 1;

        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {

            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                historyList[m_index].id = xhr.responseText;
                historyList[m_index].state = 0;
                //historyList[m_index].link = xhr.responseText;
                historyList[m_index].inProgress = true;
                $rootScope.$digest();
                console.log("xhr.responseText is: " + xhr.responseText);
            }
        };
        xhr.open("GET", `/autogen/?q=${phrase}`);
        xhr.send({
            phrase: "123test"
        });
    }

    var generateVideo = function () {

        var m_index = historyList.push({
            videoName: 'Unknown',
            date: formatDate(new Date()),
            link: '',
            inProgress: true
        }) - 1;

        var slidesClean = [];

        for (let i = 0; i < video.slides.length; i++) {
            if (i % 2 == 0)
                slidesClean.push(_.pick(video.slides[i], ['type', 'fileName', 'caption', 'zoom', 'duration']));
            else
                slidesClean.push(_.pick(video.slides[i], ['type', 'effect', 'duration']));
        }

        var dataToBackEnd = {
            videoName: video.name,
            slidesInfo: slidesClean
        };

        var formData = new FormData();
        for (let i = 0; i < video.files.length; i++)
            formData.append('images', video.files[i], video.files[i].name);


        formData.append('info', JSON.stringify(dataToBackEnd));
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {

            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                console.log('-----mmmmm------client2');
                historyList[m_index].link = xhr.responseText;
                historyList[m_index].inProgress = false;
                $rootScope.$digest();
                console.log("xhr.responseText is: " + xhr.responseText);
            }
        };

        xhr.open("POST", "/test");
        xhr.send(formData);
        console.log('-----mmmmm------client1');

    }

    return {
        uploadEvenet: uploadEvenet,
        getSlides: getSlides,
        getSlide: getSlide,
        clearSlidesList: clearSlidesList,
        generateVideo: generateVideo,
        generateAutomaticVideo: generateAutomaticVideo,
        getVideoHistoryList: getVideoHistoryList,
        getLink: getLink
    };
}])


myApp.directive('customOnChange', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeHandler = scope.$eval(attrs.customOnChange);
            element.bind('change', onChangeHandler);
        }
    };
});

myApp.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});
