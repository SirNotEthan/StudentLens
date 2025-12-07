import { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Get application version information
 */
export const getVersion = (_req: Request, res: Response) => {
  try {
    // Read version from package.json
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    const buildDate = new Date().toISOString();

    res.json({
      success: true,
      data: {
        version: packageJson.version || '2.0.0',
        name: packageJson.name || 'backend',
        environment: process.env.NODE_ENV || 'development',
        buildDate,
        nodeVersion: process.version,
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        version: '2.0.0',
        name: 'backend',
        environment: process.env.NODE_ENV || 'development',
        buildDate: new Date().toISOString(),
        nodeVersion: process.version,
      }
    });
  }
};
