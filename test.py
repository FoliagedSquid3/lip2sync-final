import ffmpeg

input_file = r'C:\Users\msidd\Downloads.\recording (4).webm'
output_file = 'output.mp4'

try:
    (
        ffmpeg
        .input(input_file)
        .output(output_file)
        .run()
    )
    print("Conversion successful")
except ffmpeg.Error as e:
    print("Error occurred:", e)