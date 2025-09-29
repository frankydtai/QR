import type { Express } from "express";
import { createServer, type Server } from "http";
import { qrGenerationSchema } from "@shared/schema";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'QR Generator API is running' });
  });

  // QR Code generation endpoint
  app.post('/api/qr/generate', async (req, res) => {
    try {
      // Validate request body
      const validation = qrGenerationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validation.error.errors 
        });
      }

      const { text, contrast, brightness, picture } = validation.data;
      
      // Create temporary directory for QR generation
      const tempId = randomUUID();
      const tempDir = path.join('/tmp', `qr_${tempId}`);
      await fs.mkdir(tempDir, { recursive: true });
      
      try {
        // Build amzqr command arguments with fixed parameters: v=10, l=H, no -c flag
        const args = [text, '-v', '10', '-l', 'H', '-n', 'qr_output.png'];
        
        // Add optional parameters
        if (contrast !== undefined) {
          args.push('-con', contrast.toString());
        }
        if (brightness !== undefined) {
          args.push('-bri', brightness.toString());
        }
        
        // Handle picture file if provided (base64 encoded)
        if (picture) {
          const pictureBuffer = Buffer.from(picture, 'base64');
          const picturePath = path.join(tempDir, 'picture.png');
          await fs.writeFile(picturePath, pictureBuffer);
          args.push('-p', 'picture.png');
        }

        console.log(`Executing QR generation with args:`, args);
        
        // Execute amzqr command safely with spawn
        await new Promise<void>((resolve, reject) => {
          const process = spawn('amzqr', args, { 
            cwd: tempDir,
            stdio: ['ignore', 'pipe', 'pipe']
          });
          
          let stdout = '';
          let stderr = '';
          
          process.stdout?.on('data', (data) => {
            stdout += data.toString();
          });
          
          process.stderr?.on('data', (data) => {
            stderr += data.toString();
          });
          
          process.on('close', (code) => {
            if (code !== 0) {
              console.error(`amzqr process exited with code ${code}`);
              console.error(`stderr: ${stderr}`);
              reject(new Error(`QR generation failed with code ${code}: ${stderr}`));
            } else {
              if (stderr) {
                console.warn(`amzqr stderr: ${stderr}`);
              }
              resolve();
            }
          });
          
          process.on('error', (error) => {
            console.error(`Failed to start amzqr process:`, error);
            reject(error);
          });
        });

        // Read the generated QR code
        const qrPath = path.join(tempDir, 'qr_output.png');
        const qrBuffer = await fs.readFile(qrPath);
        const qrBase64 = qrBuffer.toString('base64');

        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });

        // Return the QR code as base64
        res.json({
          success: true,
          qrCode: `data:image/png;base64,${qrBase64}`,
          message: "QR code generated successfully"
        });

      } catch (execError) {
        // Clean up on error
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        throw execError;
      }

    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ 
        message: "Failed to generate QR code", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
