function getUI(idName) {
    var btn = id(idName).findOnce();
    return btn;
}

function getUIs(idName) {
    var btns = id(idName).find();
    if (btns.length > 0) {
        return btns;
    }else{
        return null;
    }
}

function getWords() {
    var lv_vocab = getUI("lv_vocab");
    if (lv_vocab) {
        return lv_vocab.children();
    }else{
        return null;
    }
}

function clickWords(words, n) {
    if (n <= words.length) {
        if (words[n].findOne(id("iv_shelter"))) {
            clickUI(words[n], "/iv_shelter")
        }
        sleep(0);
        return clickUI(words[n].findOne(id("iv_audio")), "/iv_audio");
    }
}

function clickUI(btn, name) {
    if (btn != null && btn.clickable()) {
        btn.click();
        console.info("clicked " + name.split("/")[1]);
        return true;
    }else{
        console.warn("Cant click button");
        return false;
    }
}

function clickStart() {
    var btn_learn = getUI("btn_learn");
    clickUI(btn_learn, btn_learn.id());
}

function clickKnown() {
    var tv_known = getUI("tv_known");
    clickUI(tv_known, tv_known.id());
}

function clickUnknown(btn) {
    if (!btn) {
        bn = "tv_unknown";
    }
    var tv_unknown = getUI(btn);
    clickUI(tv_unknown, tv_unknown.id());
}

function clickNext() {
    var tv_next = getUI("tv_next");
    clickUI(tv_next, tv_next.id());
}

function clickNextGroup() {
    var btn_control = getUI("btn_control");
    clickUI(btn_control, btn_control.id());
}

function clickAudio() {
    var iv_audio = getUI("layout_word");
    if (iv_audio == null) {
        iv_audio = getUI("iv_vocab_audio");
    }
    if (iv_audio == null) {
        clickUI(null, "/iv_audio");
        return;
    }
    clickUI(iv_audio, iv_audio.id());
}

function enterApp() {
    var words = null;
    //启用按键监听
    events.observeKey();

    //监听音量上键按下 选择不知道 重读
    events.setKeyInterceptionEnabled("volume_up", true);
    events.onKeyUp("volume_up", function(event){
        console.log("volume_up pressed");
        if (inApp == false) {
            return;
        }
        console.log("volume_up thread start")
        //按不知道
        var thread1 = threads.start(function(){
            if (getUI("tv_unknown")) {
                thread2.join();
                thread3.join();
                thread4.join();
                clickUnknown("tv_unknown");
            }
        });

        //按不认识
        var thread2 = threads.start(function(){
            if (getUI("btn_unknown")) {
                thread1.join();
                thread3.join();
                thread4.join();
                clickUnknown("btn_unknown");
            }
        });

        //重读
        var thread3 = threads.start(function () {
            if (words != null && getUI("btn_control")) {
                var allWords = getWords()
                var count = allWords.length - words.length - 1;
                thread1.join();
                thread2.join();
                thread4.join();
                clickWords(allWords, count);
            }
        });

        //不认识重读 例句回顾
        var thread4 = threads.start(function (paras) {
            if (getUI("tv_next") && getUI("btn_unknown") == null) {
                thread1.join();
                thread2.join();
                thread3.join();
                clickAudio();
            }
        });

        thread1.join();
        thread2.join();
        thread3.join();
        thread4.join();
        console.log("volume_up thread exited");
    });

    //监听音量下键按下 选择知道 读下一个 选择下一组
    events.setKeyInterceptionEnabled("volume_down", true);
    events.onKeyUp("volume_down", function(event){
        console.log("volume_down pressed");
        if (inApp == false) {
            return;
        }
        console.log("volume_down thread start")
        //按下一个
        var thread1 = threads.start(function(){
            if (getUI("tv_next")) {
                thread2.join();
                thread3.join();
                clickNext();
            }
        });

        //按我认识
        var thread2 = threads.start(function(){
            if (getUI("tv_known")) {
                thread1.join();
                thread3.join();
                clickKnown();
            }
        });

        //读单词或者按下一组
        var thread3 = threads.start(function(){
            if (words == null && getUI("btn_control")) {
                words = getWords();
            }
            if (words != null && words.length == 0){
                words = null;
                thread1.join();
                thread2.join();
                clickNextGroup();
                return;
            }
            if (words && words.length > 0) {
                thread1.join();
                thread2.join();
                if (clickWords(words, 0)) {
                    words.shift();
                }else{
                    //释义遮挡切换丢失对象
                    words = null;
                }
            }
            
        });

        thread1.join();
        thread2.join();
        thread3.join();
        console.log("volume_down thread exited");
    });

    return true;
}

function enableInterception() {
    events.setKeyInterceptionEnabled("volume_up", true);
    events.setKeyInterceptionEnabled("volume_down", true);
    return true;
}

function disableInterception() {
    events.setKeyInterceptionEnabled("volume_up", false);
    events.setKeyInterceptionEnabled("volume_down", false);
    // events.removeAllTouchListeners();
    return false;
}

function stopClones() {
    engines.all().forEach(element => {
        var jsName = String(element.getSource())
        var ifExist = jsName.indexOf("shanbay") != -1;
        if (ifExist && element.id != engines.myEngine().id) {
            element.forceStop();
            console.warn("Stopped " + element.id + " " + element.getSource());
        }
    });
}

var inApp = true;
function main(params) {
    stopClones();
    // start app
    // 确保不被浮窗或手机快捷工具栏遮挡
    // home();
    recents()
    sleep(800);
    launch("com.shanbay.sentence");
    // clickStart()
    
    var clickThread = threads.start(function () {
        enterApp();
    });

    var inAppThread = threads.start(function () {
        
        while (true) {
            // if (currentActivity() == "com.shanbay.bay.biz.words.speed.study.StudyActivity" || currentActivity() == "com.shanbay.bay.biz.words.widget.a") {
            if (currentActivity().indexOf("com.shanbay.bay.biz.words.") == 0) {
                if (inApp != true) {
                    inApp = enableInterception();
                    console.log("Entered App");
                }
            }else{
                if (inApp != false) {
                    inApp = disableInterception();
                    console.log("Exited App");
                }
            }
            sleep(1000);
        }
    });
}

main();