import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { qrGenerationSchema } from "@shared/schema";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - using Replit Auth integration
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
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
        // Build amzqr command with fixed parameters: v=10, l=H, no -c flag
        let command = `cd ${tempDir} && python -m amzqr "${text}" -v 10 -l H -n qr_output.png`;
        
        // Add optional parameters
        if (contrast !== undefined) {
          command += ` -con ${contrast}`;
        }
        if (brightness !== undefined) {
          command += ` -bri ${brightness}`;
        }
        
        // Handle picture file if provided (base64 encoded)
        if (picture) {
          const pictureBuffer = Buffer.from(picture, 'base64');
          const picturePath = path.join(tempDir, 'picture.png');
          await fs.writeFile(picturePath, pictureBuffer);
          command += ` -p picture.png`;
        }

        console.log(`Executing QR generation command: ${command}`);
        
        // Execute amzqr command
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr) {
          console.warn(`amzqr stderr: ${stderr}`);
        }

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
