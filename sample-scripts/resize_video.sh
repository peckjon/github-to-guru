 echo input file name:
 read inputfile
 echo writing resized_$inputfile
 ffmpeg -i $inputfile -filter:v scale=720:-1 -c:a copy resized_$inputfile