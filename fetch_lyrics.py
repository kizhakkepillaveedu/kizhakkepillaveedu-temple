from youtube_transcript_api import YouTubeTranscriptApi

video_id = 'xLwtsvL1EEc'
try:
    # Trying to get the transcript
    transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ml', 'en'])
    for entry in transcript:
        if 500 <= entry['start'] <= 555:
            print(f"{entry['start']} - {entry['text']}")
except Exception as e:
    print(f"Error: {e}")
