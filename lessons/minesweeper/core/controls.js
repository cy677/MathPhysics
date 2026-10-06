
        function apply() {

            if (document.getElementById("beginner").checked) {
                doNewGame(9, 9, 10);
                return;
            }

            if (document.getElementById("intermediate").checked) {
                doNewGame(16, 16, 40);
                return;
            }

            if (document.getElementById("expert").checked) {
                doNewGame(30, 16, 99);
                return;
            }

            //const MAX_WIDTH = 250;
            //const MAX_HEIGHT = 250;

            var widthX = document.getElementById("width").value;
            var heightX = document.getElementById("height").value;
            var minesX = document.getElementById("mines").value;

            if (isNaN(widthX)) {
                document.getElementById("width").focus();
                return;
            }
            if (isNaN(heightX)) {
                document.getElementById("height").focus();
                return;
            }
            if (isNaN(minesX)) {
                document.getElementById("mines").focus();
                return;
            }

            var width = Number(widthX);
            var height = Number(heightX);
            var mines = Number(minesX);

            if (width < 1) {
                document.getElementById("width").value = 30
                width = 30;
            }

            if (width > MAX_WIDTH) {
                document.getElementById("width").value = MAX_WIDTH;
                width = MAX_WIDTH;
            }

            if (height < 1) {
                document.getElementById("height").value = 16
                height = 16;
            }

            if (height > MAX_HEIGHT) {
                document.getElementById("height").value = MAX_HEIGHT;
                height = MAX_HEIGHT;
            }

            if (mines < (analysisMode ? 0 : 1)) {
                document.getElementById("mines").value = 99
                mines = 99;
            }

            if (mines > width * height - 1) {
                document.getElementById("mines").value = width * height - 1;
                mines = width * height - 1;
            }

            doNewGame(width, height, mines);

        }

        function doNewGame(width, height, mines) {

            if (document.getElementById("useSeed").checked) {
                newGame(width, height, mines, document.getElementById("seed").value, true);
            } else {
                newGame(width, height, mines, 0, true);
            }

        }

        function setAnalysis(gotoAnalysis) {

            // can't switch modes while the solver is working
            if (canvasLocked) {
                return;
            }

            if (!analysisMode && gotoAnalysis) {
                switchToAnalysis(true);
            } else if (analysisMode && !gotoAnalysis) {
                switchToAnalysis(false);
            }

        }

        function makeCustom() {

            document.getElementById("custom").checked = true;

        }

    