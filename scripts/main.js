var epm;

function loadImage(url)
{
	var img = $(document.createElement('img'));
	img.attr("src", url);
	img.addClass("thumbnail");
	$("#inputThumbnails").append(img);
	
	epm.loadImage(url);
}

function changeMainImage(img)
{
	$("#mainImg").attr("src", img[0].src);
}

function clear()
{
	epm.clear();
	var emptySrc = "about:blank";
	//$("#mainImg").attr("src", emptySrc); A chrome no le gusta cambiar por un url vacio
	$("#inputThumbnails > img").remove();
}

function saveAs()
{
	var data = $("#mainImg").attr("src");
	window.open(data, "Mixed Image", "");
}

function setupDnD()
{
	var $dropArea = $("#appArea");

	// Attach our drag and drop handlers.
	$dropArea.bind({
		dragover: function () {
			$("#inputThumbnails").addClass("dragHover");
			return false;
		},
		dragend: function () {
			$("#inputThumbnails").removeClass("dragHover");
			return false;
		},
		drop: function (e) {
			e = e || window.event;
			e.preventDefault();

			// jQuery wraps the originalEvent, so we try to detect that here...
			e = e.originalEvent || e;
			// Using e.files with fallback because e.dataTransfer is immutable and can't be overridden in Polyfills (http://sandbox.knarly.com/js/dropfiles/).            
			var files = (e.files || e.dataTransfer.files);

			for (var i = 0; i < files.length; i++) {
				(function (i) {
					// Loop through our files with a closure so each of our FileReader's are isolated.
					var reader = new FileReader();
					
					reader.onload = function (event) {
							loadImage(event.target.result);
						};
					reader.readAsDataURL(files[i]);
				})(i);
			}
			$("#inputThumbnails").removeClass("dragHover");

			return false;
		}
	});

}


$(document).ready(function()
{
	var canvas = $("#workCanvas");
	epm = new EasyPhotoMixer( canvas );
	
	$("#startBtn").click(function(){
		try
		{
			$("#logo").addClass("spin");
			epm.manipulate(function(){
				var img = epm.getResultingImg();
				changeMainImage(img);
				$("#logo").removeClass("spin");
			});
		}
		catch(e)
		{
			$("#logo").removeClass("spin");
			throw e;
		}
	});
	
	$("#clearBtn").click(function(){
		clear();
	});
	
	$("#saveBtn").click(function(){
		saveAs();
	});
	
	setupDnD();
});