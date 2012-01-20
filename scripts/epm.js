function EasyPhotoMixer(canvas)
{
this.canvas = canvas;
this.context = canvas[0].getContext("2d");

this.images = new Array();
this.width = 0;
this.height = 0;

this.algo = new basicAlg();

this.loadImage = function(url)
{
	var imgRaw = new Image();
	imgRaw.src = url;
	this.images.push(imgRaw);
}

this.getResultingImg = function()
{
	var strSource = this.canvas[0].toDataURL("image/jpeg");
	var img = $(document.createElement('img'));
	img.attr("src", strSource);
	return img;
}

this.clear = function()
{
	this.images.length = 0;
}

this.manipulate = function(callback)
{
	this.algo.setImageCount(this.images.length);
	var pixelData = this.getPixelData();
	var result = this.getCleanPixels();
	
	//Stop every 1k pixels and let the browser work
	this.asyncWork(result, pixelData, callback);
}

this.asyncWork = function(result, pixelData, callback)
{
	var isDone = this.doWorkStep(result, pixelData);
	
	if(isDone)
	{
		this.context.putImageData( result.imageData, 0, 0);
		callback();
	}
	else
	{
		setTimeout( 
			this.asyncWork(result, pixelData, callback)  
			, 1);
	}
}

this.doWorkStep = function(result, pixelData)
{
	for(var i = 0 ; (i < 2500) && result.hasNext() ; i++)
	{
		var resultingPixel = result.getNext();
		var pixels = new Array();
		for(j = 0 ; j < pixelData.length ; j++)
		{
			pixels.push( pixelData[j].getNext() );
		}
		
		this.algo.process(resultingPixel, pixels);
		result.update(resultingPixel);
	}
	
	return (result.hasNext() == false);
}

this.getPixelData = function()
{
	this.setCanvasSize();
	var result = new Array();
	var context = this.context;
	
	for(var i=0; i < this.images.length ;i++)
	{
		context.drawImage(this.images[i], 0, 0);
		var imgData = this.context.getImageData(0, 0, this.width, this.height);
		var pixels = new PixelArray(imgData);
		result.push(pixels);
	}	
	return result;
}

this.getCleanPixels = function()
{
	this.context.fillStyle = "#000";
	this.context.fillRect(0, 0, this.width, this.height);
	var imgData = this.context.getImageData(0, 0, this.width, this.height);
	var pixels = new PixelArray(imgData);
	return pixels;
}

this.setCanvasSize = function()
{
	this.width = this.images[0].width;
	this.height = this.images[0].height;
	this.canvas.attr("width", this.width);
	this.canvas.attr("height", this.height);
}

function PixelArray(imageData)
{
	this.imageData = imageData;
	this.data = imageData.data;
	this.width = imageData.width;
	this.height = imageData.height;
	
	this.current = 0;
	
	this.getNext = function()
	{
		var r = this.data[this.current];
		var g = this.data[this.current+1];
		var b = this.data[this.current+2];
		var a = this.data[this.current+3];
		
		var pixelNumber = this.current/4;
		var y = Math.floor( pixelNumber/this.width );
		var x = pixelNumber%this.width;
		
		var pixel = new Pixel(x, y, r, g, b, a);
		this.current += 4;
		return pixel;
	}
	
	this.hasNext = function()
	{
		var result = this.data.length > this.current; //Off by 1??
		return result;
	}
	
	this.getPixel = function(x, y)
	{
		var offset = this.getOffset(x, y);
		var red = this.data[offset];
        var green = this.data[offset + 1];
        var blue = this.data[offset + 2];
	}
	
	this.update = function(pixel)
	{
		var offset = this.getOffset(pixel.x, pixel.y);
		this.data[offset] = pixel.red;
		this.data[offset+1] = pixel.green;
		this.data[offset+2] = pixel.blue;
		this.data[offset+3] = pixel.alpha;
	}
	
	this.getOffset = function(x, y)
	{
		return ((this.width * y) + x) * 4;
	}
}

function Pixel(x, y, red, green, blue, alpha)
{
	//TODO: En lugar (x,y) se podria guardar el offset unicamente
	//Tener el offset como main y calcular (x,y) para referencia
	this.x = x;
	this.y = y;
	this.red = red;
	this.green = green;
	this.blue = blue;
	this.alpha = alpha;
	
	this.avgDistance = 0;
	this.timesCompared = 0;
	
	this.updateAvgDistance = function(distance)
	{
		var avg = (this.avgDistance*this.timesCompared) + distance;
		avg = avg / (this.timesCompared+1);
		 
		this.timesCompared++;
		this.avgDistance = avg;
	}
}

};


//Implementar otro algoritmo usando la media
//Tambien se puede crear uno para obtener las diferencias entre fotos
function basicAlg()
{
	this.percentile = 0.75;
	this.dropCount = 1;
	
	this.setImageCount = function(imageCount)
	{
		this.dropCount = Math.floor(imageCount * this.percentile);
	}
	
	this.process = function(result, pixelArray)
	{
		for(i = 0 ; i < pixelArray.length ; i++)
		{
			var p1 = pixelArray[i];
			for(j = i+1 ; j < pixelArray.length ; j++)
			{
				var p2 = pixelArray[j];
				this.setDistance(p1, p2);
			}
		}
		
		for(var i = 0 ; i < this.dropCount ; i++)
		{
			this.dropFarthest(pixelArray);
		}
		this.merge(result, pixelArray);
	}
	
	this.setDistance = function(p1,p2)
	{
		var distance = this.calcDistance(p1, p2);
		p1.updateAvgDistance(distance);
		p2.updateAvgDistance(distance);
	}
	
	this.calcDistance = function(p1, p2)
	{
		var dr2 = Math.pow( (p1.red - p2.red) , 2);
		var dg2 = Math.pow( (p1.green - p2.green) , 2);
		var db2 = Math.pow( (p1.blue - p2.blue) , 2);
		var distance = Math.sqrt(dr2 + dg2 + db2);
		return distance;
	}
	
	this.dropFarthest = function(pixelArray)
	{
		var farthest = 0;
		var distance = 0;
		
		for(i = 0; i<pixelArray.length ; i++)
		{
			var pixel = pixelArray[i];
			if(pixel.avgDistance > distance)
			{
				farthest = i;
				distance = pixel.avgDistance;
			}
		}
		pixelArray.splice(farthest, 1);
	}
	
	this.merge = function(result, pixelArray)
	{
		var count = pixelArray.length;
		for(i=0 ; i < count ; i++)
		{
			var pixel = pixelArray[i];
			result.red += pixel.red;
			result.green += pixel.green;
			result.blue += pixel.blue;
		}
		
		result.red /= count;
		result.green /= count;
		result.blue /= count;
	}
	
	
}