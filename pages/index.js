import { useState } from 'react';

export default function Home() {
  const [image, setImage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [translatedImage, setTranslatedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // To track if the process is ongoing

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('file', image);

    // Show progress bar and disable button to prevent multiple clicks
    setIsProcessing(true);
    setProgress(0);

    const response = await fetch('/api/translate', {
      method: 'POST',
      body: formData,
    });
  
    if (response.ok) {
      const { requestId} = await response.json();

      // Poll progress
      const interval = setInterval(async () => {
        console.log(`Polling progress for requestId: ${requestId}`); // Log requestId
      
        try {
          const progressResponse = await fetch(`/api/translate?requestId=${requestId}`);
          const data = await progressResponse.json();
      
          console.log(`Received progress: ${data.progress}`); // Log progress
          
          // Check if progress has changed
          if (progress !== data.progress) {
            setProgress(data.progress);
          }
      
          if (data.progress === 100) {
            clearInterval(interval); // Stop polling
            console.log(data);
            setTranslatedImage(data.outputPath);
            setIsProcessing(false); // Enable the button
          }
        } catch (err) {
          console.error('Error fetching progress:', err);
          clearInterval(interval); // Stop polling on error
          setIsProcessing(false); // Enable the button
        }
      }, 4000);

    } else {
      alert('Image translation failed');
      setIsProcessing(false); // Enable button in case of failure
    }
  };

  return (
    <div>
      <h1>Manga Translator</h1>
      <input type="file" onChange={(e) => setImage(e.target.files[0])} />
      <button onClick={handleUpload} disabled={isProcessing || !image}>
        Translate
      </button>

      {/* Show progress bar */}
      {isProcessing && progress < 100 && <progress value={progress} max="100" />}
      {progress === 100 && <p>Translation Complete!</p>}

      {/* Display the translated image */}
      {translatedImage && <img src={translatedImage} alt="Translated Manga" />}
    </div>
  );
}