<?php

/**
 * Request proxy for accessing APIs from Ajax.
 * Note: this hasn't really been secured very well yet.  The url querystring parameter might be hackable.
 */
$url = $_GET['url'];

if(substr($url,0,7) == 'http://') {
	$cacheFile = '/tmp/tweetmeter-' . md5($url);
	if(file_exists($cacheFile) && filemtime($cacheFile) > (time() - 3600)) {
		list($statusCode, $responseBody) = unserialize(file_get_contents($cacheFile));
	} else {
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION,1);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

		// Add authentication
		if(isset($_SERVER['PHP_AUTH_USER'])) curl_setopt($ch, CURLOPT_USERPWD, "$_SERVER[PHP_AUTH_USER]:$_SERVER[PHP_AUTH_PW]");

		// Add fields to POST requests
		if(isset($_POST) && $_POST) {
			curl_setopt($ch, CURLOPT_POST, 1);
			curl_setopt($ch, CURLOPT_POSTFIELDS, $_POST);
		}

		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

		$responseBody = curl_exec($ch);
		$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		
		$fh = fopen($cacheFile,'w');
		fwrite($fh, serialize(array($statusCode, $responseBody)));
		fclose($fh);
	}
	
	header("HTTP/1.1 $statusCode");
	echo $responseBody;
} else {
	header("HTTP/1.1 400 Bad request");
}