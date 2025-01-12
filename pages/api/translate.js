import { spawn } from 'child_process';
import { IncomingForm } from 'formidable'; // Correct import
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable body parser for file uploads
  },
};

const progressStore = {};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const outputDir = path.join(process.cwd(),'public','output');

    // Ensure upload and output directories exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        return res.status(500).json({ error: 'File upload failed' });
      }

      // Check if the file is uploaded
      const uploadedFile = files.file?.filepath || files.file?.[0]?.filepath;
      if (!uploadedFile) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = uploadedFile;
      const outputFilePath = path.join(outputDir, `translated_${path.basename(filePath)}`);
      const requestId = Date.now().toString();
      progressStore[requestId] = { progress: 0, outputPath: `/output/translated_${path.basename(filePath)}` };

      console.log('FilePath:', filePath);
      console.log('OutputFilePath:', outputFilePath);

      // Verify the file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      console.log('File exists, starting translation...');

      // Command to activate the virtual environment and execute the script
      const command = `bash -c "source /app/venv_main/bin/activate && python main.py '${filePath}' '${outputFilePath}'"`;
      const pythonProcess = spawn(command, {
        shell: true, // Enables shell mode
      });

  

      let pythonError = '';
      pythonProcess.stdout.on('data', (data) => {
        const message = data.toString();
        console.log(`Python stdout: ${message}`);

        //Extract progress data
        const progressMatch = message.match(/PROGRESS:(\d+)/);
          if (progressMatch) {
            const progress = parseInt(progressMatch[1], 10);
            if (progressStore[requestId].progress !== progress) {
              progressStore[requestId].progress = progress;
              console.log(`Updated progress for requestId ${requestId}: ${progress}%`);
            }
        }
      

      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python stderr: ${data}`);
        pythonError += data.toString();
      });

      // Handle script completion
      pythonProcess.on('close', async (code) => {
        console.log(`Python script exited with code: ${code}`);
        if (code === 0) {
          try {
            if (!fs.existsSync(outputFilePath)) {
              console.error('Output file not created:', outputFilePath);
              return res.status(500).json({ error: 'Output file not created' });
            }

            // Read the output file and send it as a response
            progressStore[requestId].progress = 100; 
            console.log("HOOLA",progressStore[requestId]);
            res.status(200).json({requestId,outputPath: progressStore[requestId].outputPath});
          } catch (err) {
            console.error('Error reading output file:', err);
            res.status(500).json({ error: 'Error reading translated file' });
          }
        } else {
          console.error('Translation process failed:', pythonError);
          res.status(500).json({ error: 'Translation process failed', details: pythonError });
        }
      });

      // Handle Python process errors
      pythonProcess.on('error', (err) => {
        console.error('Error starting Python process:', err);
        res.status(500).json({ error: `Python process error: ${err.message}` });
      });
      // **Immediate Response** (this part ensures the immediate response you need)
      res.status(200).json({
        requestId,  // Return the unique requestId
        message: 'Translation started, please check the progress.',
      });
    });
  } else if(req.method === 'GET'){
    const {requestId} =req.query;
    console.log(`Progress request received for requestId: ${requestId}`);
    if (!requestId || !(requestId in progressStore)) {
      console.error(`Invalid requestId or not in progressStore: ${requestId}`);
      return res.status(404).json({ error: 'Invalid request ID' });
    }
    const { progress, outputPath } = progressStore[requestId];
    console.log(`Returning progress for requestId ${requestId}: ${progress}% ${outputPath}`);
    res.status(200).json({ progress, outputPath });
  } 
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}