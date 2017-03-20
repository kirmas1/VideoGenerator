var myApp = angular.module('myApp', ['ui.router', 'ngResource', 'ngMaterial']);


myApp.config(function ($stateProvider) {
    $stateProvider
        .state('homee', {
            url: '',
            templateUrl: 'pages/main.html',
            controller: 'mainController'
        })
        .state('home', {
            url: '/home',
            templateUrl: 'pages/main.html',
            controller: 'mainController'
        })
        .state('fakevideoplayer', {
            url: '/thevideo',
            templateUrl: 'pages/fakevideoplayer.html',
            controller: 'fakeVideoPlayerController'
        })
        .state('realvideo', {
            url: '/realvideo',
            templateUrl: 'pages/realvideo.html',
            controller: 'realVideoController'
        })
});

myApp.service('videoService', function () {

    var ImagesPath;
    var textsList = [];
    var imagesNames = [];
    var typeSpeeds = [];

    var addImageName = function (name) {
        imagesNames.push(name);
    };
    var getImagesNames = function () {
        return imagesNames;
    };
    var addText = function (newObj) {
        textsList.push(newObj);
    };
    var addTexts = function (arr) {
        textsList.push.apply(textsList, arr)
    };
    var getTexts = function () {
        return textsList;
    };
    var setImagesPath = function (path) {
        ImagesPath = (path);
    };
    var getImagesPath = function () {
        return ImagesPath;
    };
    var addTypeSpeed = function (speed) {
        typeSpeeds.push(speed);
    };
    var getTypeSpeeds = function () {
        return typeSpeeds;
    };

    return {
        addImageName: addImageName,
        getImagesNames: getImagesNames,
        addText: addText,
        addTexts: addTexts,
        getTexts: getTexts,
        setImagesPath: setImagesPath,
        getImagesPath: getImagesPath,
        addTypeSpeed: addTypeSpeed,
        getTypeSpeeds: getTypeSpeeds
    };

});


myApp.controller('mainController', ['$state', '$http', '$scope', 'videoService', function ($state, $http, $scope, videoService) {


    var imageFiles = []; //for sending to server
    var file;
    var formData = new FormData(); // Currently empty
    $scope.chosenImageName = "";
    $scope.ListItems = [];

    $scope.isReadyToAddItem = function () {
        return ($scope.chosenImageName != "");
    }

    $scope.uploadFile = function (event) {
        file = event.target.files;
        $scope.$apply(function () {
            $scope.chosenImageName = file[0].name;
        });
    };

    $scope.addItem = function () {
        //        imageFiles.push.apply(imageFiles, file);  if we want to allow multiple
        imageFiles.push(file[0]);
        $scope.ListItems.push({
                fileName: $scope.chosenImageName,
                caption: $scope.caption || "        ",
                typeSpeed: 5
            })
            //Reset the input fields:
        $scope.chosenImageName = "";
        $scope.caption = "";
    }

    $scope.removeItem = function (index) {
        $scope.ListItems.splice(index, 1);
        imageFiles.splice(index, 1);

    }

    var swipe = function (origin, dest) {

        var temp = $scope.ListItems[dest];
        var tempFile = imageFiles[dest];

        $scope.ListItems[dest] = $scope.ListItems[origin];
        $scope.ListItems[origin] = temp;

        imageFiles[dest] = imageFiles[origin];
        imageFiles[origin] = tempFile;
    }

    $scope.moveUpItem = function (index) {
        swipe(index, index - 1);
    }

    $scope.moveDownItem = function (index) {
        swipe(index, index + 1);
    }

    $scope.generateFile = function () {

        var arrayLength = imageFiles.length;
        for (var i = 0; i < arrayLength; i++) {
            formData.append('images', imageFiles[i]);
            formData.append('captions', $scope.ListItems[i].caption);
            videoService.addText($scope.ListItems[i].caption);
            videoService.addImageName($scope.ListItems[i].fileName);
            videoService.addTypeSpeed($scope.ListItems[i].typeSpeed);
        }

        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {

            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                console.log("xhr.responseText is: " + xhr.responseText);
                videoService.setImagesPath(xhr.responseText);
                $state.go('fakevideoplayer');
            }
        };

        xhr.open("POST", "/generate");
        xhr.send(formData);
    }

}]);

myApp.controller('realVideoController', ['$state', '$http', '$scope', 'videoService', '$mdDialog', function ($state, $http, $scope, videoService, $mdDialog) {

    var imageFiles = []; //for sending to server
    var formData = new FormData(); // Currently empty

    $scope.listItems = [];
    $scope.video_is_ready = false;

    $scope.removeItem = function (index) {
        $scope.listItems.splice(index, 1);
        imageFiles.splice(index, 1);

    }

    var swipe = function (origin, dest) {

        var temp = $scope.listItems[dest];
        var tempFile = imageFiles[dest];

        $scope.listItems[dest] = $scope.listItems[origin];
        $scope.listItems[origin] = temp;

        imageFiles[dest] = imageFiles[origin];
        imageFiles[origin] = tempFile;
    }

    $scope.moveUpItem = function (index) {
        swipe(index, index - 1);
    }

    $scope.moveDownItem = function (index) {
        swipe(index, index + 1);
    }

    $scope.uploadFile = function (event) {
        files = event.target.files;

        for (var i = 0; i < files.length; i++) {
            $scope.$apply($scope.listItems.push({
                fileName: files[i].name,
                caption: "",
                typeSpeed: 5
            }))
            imageFiles.push(files[i]);
        }

    };

    $scope.generateFile = function () {

        for (var i = 0; i < imageFiles.length; i++) {
            formData.append('images', imageFiles[i], imageFiles[i].name);
            //formData.append('captions', $scope.listItems[i].caption);
        }
        formData.append('info', JSON.stringify($scope.listItems));
        var xhr = new XMLHttpRequest();


        xhr.onreadystatechange = function () {

            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                console.log("xhr.responseText is: " + xhr.responseText);
                videoService.setImagesPath(xhr.responseText);
                $scope.video_is_ready = true;
                $scope.$digest();
                
                //$state.go('theRealVideoPlayer');
            }
        };

        xhr.open("POST", "/test");
        xhr.send(formData);


    }

    $scope.showAdvanced = function (ev) {
        $mdDialog.show({
                controller: DialogController,
                templateUrl: 'pages/videodialog.html',
                //parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
            })
            .then(function (answer) {
                $scope.status = 'You said the information was "' + answer + '".';
            }, function () {
                $scope.status = 'You cancelled the dialog.';
            });
    };

    function DialogController($scope, $mdDialog) {
        $scope.video_src = '/videos/' + videoService.getImagesPath();
        $scope.closeDialog = function () {
            $mdDialog.hide();
        }
        $scope.cancel = function () {
            $mdDialog.cancel();
        };
    }


            }]);

myApp.controller('fakeVideoPlayerController', ['$timeout', '$scope', 'videoService', function ($timeout, $scope, videoService) {
    var texts = videoService.getTexts();
    var imagesPath = videoService.getImagesPath();
    var imagesNames = videoService.getImagesNames();
    var typeSpeeds = videoService.getTypeSpeeds();

    $scope.activated = false;

    $scope.startVideo = function () {
        jQuery(".play-btn").hide();
        $scope.activated = true;
        $timeout(function () {
            $scope.activated = false;
            jQuery('.typeTextH2').css("top", "80%");
            jQuery('.typeTextH2').css("left", "4%");
            jQuery('.typeTextH2').show();
            playVideo(0);
        }, 2200);

    }

    var playVideo = function (index) {
        if (index < texts.length) {
            console.log(200 - 20 * typeSpeeds[index]);
            jQuery(".element").typed({
                strings: [texts[index]],
                typeSpeed: (200 - 20 * typeSpeeds[index]),
                preStringTyped: function () {
                    jQuery('#theImage').attr('src', imagesPath + '/' + imagesNames[index]);
                },
                callback: function () {
                    setTimeout(function () {
                        playVideo(index + 1);
                    }, 1500);
                }
            });

        } else {
            jQuery('.typeTextH2').css("top", "50%");
            jQuery('.typeTextH2').css("left", "38%");

            jQuery(".element").typed({
                strings: ["Thank you for watching"],
                typeSpeed: 100,
                preStringTyped: function () {
                    jQuery('#theImage').attr('src', "/images/endScreen.jpg");
                },
                callback: function () {
                    jQuery('#theImage').attr('src', "");
                    jQuery('.typeTextH2').hide();
                    jQuery(".play-btn").show();
                }
            });
        }

    };

}]);


myApp.directive('customOnChange', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeHandler = scope.$eval(attrs.customOnChange);
            element.bind('change', onChangeHandler);
        }
    };
});
