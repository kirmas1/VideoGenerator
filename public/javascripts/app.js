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
        $urlRouterProvider.otherwise('/dashboard');

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
                controller: 'automaticCtrl'
            })
            .state('videos', {
                url: '/videos',
                templateUrl: 'pages/customerVideosManager.html',
                controller: 'customerVideosManagerCtrl'
            })
            .state('home', {
                url: '/dashboard',
                templateUrl: 'pages/dashboard.html',
                controller: 'dashboardManagerCtrl'
            })
  }]);

myApp.controller('dashboardManagerCtrl', ['$scope', '$rootScope', '$state', '$mdSidenav', function ($scope, $rootScope, $state, $mdSidenav) {

    // Load the Visualization API and the corechart package.
    google.charts.load('current', {
        'packages': ['corechart', 'gauge']
    });

    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(drawChart);

    // Callback that creates and populates a data table,
    // instantiates the pie chart, passes in the data and
    // draws it.
    function drawChart() {

        // Create the data table.
        var PieChartData = new google.visualization.DataTable();
        PieChartData.addColumn('string', 'Source');
        PieChartData.addColumn('number', 'Videos');
        PieChartData.addRows([
          ['From URL', 378],
          ['Phrase', 144],
          ['Studio', 52]
        ]);

        // Set chart options
        var PieChartOptions = {
            'title': 'Videos Source'
                //            'width': 400,
                //            'height': 300
        };


        var LineChartData = google.visualization.arrayToDataTable([
          ['Month', 'URL', 'Phrase', 'Studio'],
            ['March', 1000, 400, 32],
          ['April', 1170, 460, 38],
          ['May', 660, 1120, 55],
          ['June', 1030, 540, 53]
        ]);

        var LineChartOptions = {
            title: 'Video Production',
            curveType: 'function',
            legend: {
                position: 'bottom'
            }
        };

        var LineChart = new google.visualization.LineChart(document.getElementById('curve_chart'));
        LineChart.draw(LineChartData, LineChartOptions);

        // Instantiate and draw our chart, passing in some options.
        var PieChart = new google.visualization.PieChart(document.getElementById('chart_div'));
        PieChart.draw(PieChartData, PieChartOptions);
    }

}]);

myApp.controller('sideNavCtrl', ['$scope', '$rootScope', '$state', '$mdSidenav', function ($scope, $rootScope, $state, $mdSidenav) {

    $scope.closeSideNav = function () {
        $mdSidenav('left').close();
    }

    $scope.goToMyVideos = function () {
        $rootScope.$broadcast('hideTabs');
        $state.go('videos');
    }
    $scope.goToAutomatic = function () {
        $rootScope.$broadcast('goToAutomatic');
    }
    $scope.goToStudio = function () {
        $rootScope.$broadcast('goToStudio');
    }
    $scope.goToHome = function () {
        $rootScope.$broadcast('goToHome');
    }

}]);

myApp.controller('toolBarCtrl', ['$rootScope', '$scope', '$mdSidenav', function ($rootScope, $scope, $mdSidenav) {

    $scope.goToHome = function () {
        $rootScope.$broadcast('goToHome');
    }
    $scope.toggleLeft = buildToggler('left');
    $scope.toggleRight = buildToggler('right');

    function buildToggler(componentId) {

        return function () {
            $mdSidenav(componentId).toggle();
        };
    }

}]);

myApp.controller('mainNavCtrl', ['$scope', '$state', 'videoService', function ($scope, $state, videoService) {

    $scope.showTabNav = true;

    $scope.currentNavItem = 'Home';

    $scope.$on('videosHistoryCtrl.takeToStudio', function (event, args) {
        $scope._goto(args.state);
    });

    $scope.$on('goToStudio', function (event, args) {
        $scope.showTabNav = true;
        $scope._goto('manual.instructions');
    });

    $scope.$on('goToAutomatic', function (event, args) {
        $scope.showTabNav = true;
        $scope._goto('automatic');
    });

    $scope.$on('goToHome', function (event, args) {
        $scope.showTabNav = true;
        $scope._goto('home');
    });

    $scope.$on('hideTabs', function (event, args) {
        $scope.showTabNav = false;
    });

    $scope._goto = function (state) {

        switch (state) {
            case 'automatic':
                $scope.currentNavItem = 'Automatic';
                break;
            case 'manual.instructions':
                $scope.currentNavItem = 'Manual';
                break;
            case 'home':
                $scope.currentNavItem = 'Home';
                break;
        }
        //$scope.currentNavItem = state === 'automatic' ? 'Automatic' : 'Manual';
        $state.go(state);
    }

}]);

myApp.controller('customerVideosManagerCtrl', ['$scope', '$rootScope', '$state', '$mdDialog', 'videoService', function ($scope, $rootScope, $state, $mdDialog, videoService) {

    $scope.videoHistoryList = [];

    videoService.getVideoHistoryList()
        .then((res) => {
            $scope.videoHistoryList = res;
            $scope.$digest();
        });

    $scope.takeToStudio = function (index) {

        videoService.loadVideoDetailsToStudio(index);

        $rootScope.$broadcast('goToStudio');

    }

    $scope.playVideo = function (ev, index) {

        $mdDialog.index = index;
        $mdDialog.show({
            controller: playVideoDialogController,
            templateUrl: 'pages/play_video_dialog.html',
            //parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
            fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
        })
    };

    /*
    Deprecated
    */
    $scope.showDetails = function (ev, index) {

        $mdDialog.index = index;
        $mdDialog.show({
            controller: detailsDialogController,
            templateUrl: 'pages/video_details_dialog.html',
            targetEvent: ev,
            clickOutsideToClose: true,
            fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
        })
    };

    $scope.getVideoStatus = function (index) {

            var statusMap = {
                '-1': 'Request approved',
                '0': 'Proccessing',
                '1': 'Ready',
                '2': 'Failed'
            };
            return statusMap[$scope.videoHistoryList[index].metadata.state];
        }
        /*
        Deprecated
        */
    function detailsDialogController($scope, $mdDialog) {
        $scope.video = videoService.getVideoByIndex($mdDialog.index);

        $scope.getVideoStatus = function () {
            var statusMap = {
                '-1': 'Request approved',
                '0': 'Proccessing',
                '1': 'Ready',
                '2': 'Failed'
            };
            return statusMap[$scope.video.metadata.state];
        }

        $scope.takeToStudio = function () {

            videoService.loadVideoDetailsToStudio($mdDialog.index);

            $rootScope.$broadcast('goToStudio');

            $mdDialog.hide();

        }

        $scope.closeDialog = function () {
            $mdDialog.hide();
        }
        $scope.cancel = function () {
            $mdDialog.cancel();
        };
    }

    function playVideoDialogController($scope, $mdDialog) {

        console.log(`playVideoDialogController:: $mdDialog.index = ${$mdDialog.index}`);

        $scope.video = videoService.getVideoByIndex($mdDialog.index);

        console.log(`playVideoDialogController:: $scope.video.metadata.link = ${$scope.video.metadata.link}`);

        $scope.closeDialog = function () {
            $mdDialog.hide();
        }
        $scope.cancel = function () {
            $mdDialog.cancel();
        };
    }

}]);

myApp.controller('automaticCtrl', ['$scope', '$q', 'videoService', function ($scope, $q, videoService) {
    //console.log(`automaticCtrl`);

    $scope.searchText = '';

    // list of `state` value/display objects
    $scope.phrases = loadAll();

    $scope.generateAutomaticVideo = function () {

        //console.log(`automaticCtrl::genrateAutomaticVideo::search  = ${$scope.searchText}`);

        if ($scope.searchText) videoService.generateAutomaticVideo($scope.searchText);
        $scope.searchText = '';

    }

    $scope.querySearch = function (query) {
        var results = query ? $scope.phrases.filter(createFilterFor(query)) : $scope.phrases;
        //console.log('-----------results are:' + results);
        return results.slice(0, 3);
    }

    $scope.searchTextChange = function (text) {
        //console.log('Text changed to ' + text);
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

    $scope.video = videoService.manualVideo;
    var uploadClicks = 0;
    $scope.slides = videoService.getSlides();


    $scope.$watch('selectedIndex', function (newValue, oldValue) {
        if (newValue != oldValue && newValue != null && oldValue == null) {
            //console.log('Ohh ohhhhh');
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



myApp.factory('videoService', ['$rootScope', '$state', function ($rootScope, $state) {

    var updateVideoIndex = 0;
    var socket = io.connect('http://localhost:3000');
    //var socket = io.connect('http://ec2-35-162-54-141.us-west-2.compute.amazonaws.com:3000');

    socket.on('connection approved', function (data) {
        //console.log('connection approved ' + data);
    });

    socket.on('update', function (video) {
        for (updateVideoIndex = 0; updateVideoIndex < historyList.length; updateVideoIndex++) {
            if (historyList[updateVideoIndex].videoName === video.videoName &&
                historyList[updateVideoIndex].clientName === video.clientName) {
                historyList[updateVideoIndex] = video;
                break;
            }
        }
        $rootScope.$digest();
    });


    var video = {
        files: [],
        name: null,
        slides: [] //slides includes transitions
    };

    /*
    Each object in this list should contain:
    videoName, date, link, inProgress (T/F)
    */
    var historyList = [];

    var loadVideoDetailsToStudio = function (index) {
        video.slides = historyList[index].info.slidesInfo;
        video.name = historyList[index].videoName;
    }

    var getVideoHistoryList = function () {

        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {

                if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {

                    historyList = JSON.parse(xhr.responseText);
                    $rootScope.$digest();
                    resolve(historyList);
                }

            };
            xhr.open("GET", `/res/videos/all`, true);
            xhr.send();
        });
    }

    var getLink = function (index) {
        return historyList[index].metadata.link;
    }

    var getVideoByIndex = function (index) {
        return historyList[index];
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
                        tts: {
                            enable: false
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
        /*
        Called from automatic
        */
    var generateAutomaticVideo = function (phrase) {
            console.log('videoService::generateAutomaticVideo:: phrase = ' + phrase);

            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {

                if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {

                    var jsonResponse = JSON.parse(xhr.responseText);

                    historyList.push(jsonResponse);

                    $rootScope.$digest();

                    $rootScope.$broadcast('hideTabs');
                    $state.go('videos');
                } else {
                    //TODO - Prompt error
                }
            };
            xhr.open("GET", `/autogen/?q=${phrase}`, true);
            xhr.send();
        }
        /*
        Called from studio
        */
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
                slidesClean.push(_.pick(video.slides[i], ['type', 'fileName', 'caption', 'zoom', 'duration', 'tts']));
            else
                slidesClean.push(_.pick(video.slides[i], ['type', 'effect', 'duration']));
        }

        //        var dataToBackEnd = {
        //            videoName: video.name,
        //            slidesInfo: slidesClean
        //        };
        var dataToBackEnd = {
            clientName: 'Sagi',
            videoName: video.name,
            metadata: {
                origin: 0, // 0 - manual(studio), 1 - phrase, 2 - URL
                phrase: null,
                determinedTopic: null, //the extracted topic from phrase or URL
                url: null,
                name: video.name,
                timeCreated: formatDate(new Date()), //The request
                ffmpegProcessDuration: null,
                link: null, //link to final video
                state: -1, // -1 - Init, 0 - InProgress, 1 - Ready, 2 - Failed
                inProgress: false
            },
            info: {
                tempFolder: null,
                audio: {
                    enable: true,
                    file_path: 'assets/bg_music_0.mp3'
                },
                slidesInfo: slidesClean
            }
        };

        var formData = new FormData();
        for (let i = 0; i < video.files.length; i++)
            formData.append('images', video.files[i], video.files[i].name);


        formData.append('info', JSON.stringify(dataToBackEnd));
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {

            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                historyList[m_index].link = xhr.responseText;
                historyList[m_index].inProgress = false;
                $rootScope.$digest();
                console.log("xhr.responseText is: " + xhr.responseText);

                console.log('------00000-----');
                $rootScope.$broadcast('hideTabs');
                $state.go('videos');
            } else {
                //TODO Prompt erroe
            }
        };

        xhr.open("POST", "/manualgen", true);
        xhr.send(formData);


    }

    return {
        uploadEvenet: uploadEvenet,
        getSlides: getSlides,
        getSlide: getSlide,
        manualVideo: video,
        clearSlidesList: clearSlidesList,
        generateVideo: generateVideo,
        generateAutomaticVideo: generateAutomaticVideo,
        getVideoHistoryList: getVideoHistoryList,
        getLink: getLink,
        getVideoByIndex: getVideoByIndex,
        loadVideoDetailsToStudio: loadVideoDetailsToStudio
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
