document.body.addEventListener('touchstart', function () {});
/*alert(document.body.clientWidth / document.body.clientHeight);*/
$(".bottomBox .pull-right").click(function(){
    $(".conBox").hide(500);
	if($(this).attr("next")) {
		$("." + $(this).attr("next")).show(500);
	} else {
		$(".indexCon").show(500);
	}
});

$(".indexX img").click(function(){
	if($(this).attr("cmd")) {
		ajaxPlay($(this).attr("cmd"));
	}
	
	if($(this).attr("next")) {
		$(".conBox").hide(500);
		$("." + $(this).attr("next")).show(500);
	}
});

/*$(".indexCon .centerBox img").click(function(){
	$(".conBox").hide(500);
	$("." + $(this).attr("next")).show(500);
});*/

$(".computeBtn").click(function(){
	$(".computeLogna span").hide(500);
    $(".conBox").hide(500);
	$(".computeLogna").show(500);
});

$(".volumeBtn").click(function(){
	if($(this).attr("cmd")) {
		ajaxPlay($(this).attr("cmd"));
	}
	
	if($(this).attr("next")) {
		$(".conBox").hide(500);
		$("." + $(this).attr("next")).show(500);
	}
});

$("#button").click(function(){
	 if($("#Password").val() == "123456"){
		$(".conBox").hide(500);
		$(".computeCtrl").show(500);
	 }else{
		 $(".computeLogna span").css("display","inherit");
	 } 
});
 
$(".ajaxInput img").click(function(){
	 if($(this).attr("class") != "pull-right"){
		 ajaxPlay($(this).attr("cmd"))
	 }	
});

$(".computeCtrl p img").click(function(){
	if($(this).attr("cmd")) {
		ajaxPlay($(this).attr("cmd"));
	}
});

$(".ylkz p img").click(function(){
	if($(this).attr("cmd")) {
		ajaxPlay($(this).attr("cmd"));
	}
});

function ajaxPlay(cmd){
	$.ajax({
		url: "/ctrl?cmd=" + cmd,
		type: "post",
		dataType: 'json',
		success: function (data) {
		}
	});
$('#cli')[0].play(); 
}