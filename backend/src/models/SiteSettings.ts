import { databases, DATABASE_ID, ID, Query } from '@/config/appwrite';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

const SETTINGS_COLLECTION_ID = 'site_settings';

export interface ISiteSettings {
  id: string;
  siteName: string;
  tagline: string;
  contactEmail: string;
  contactRoom: string;
  contactRoomFullName: string;
  contactPhone: string;
  officeHours: string;
  socialTwitter: string;
  socialInstagram: string;
  socialFacebook: string;
  gamesImage?: string;
  createdAt: string;
  updatedAt: string;
}

export class SiteSettings {
  /**
   * Get site settings (there should only be one document)
   */
  static async get(): Promise<ISiteSettings> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        [Query.limit(1)]
      );

      if (response.documents.length === 0) {
        // Create default settings if they don't exist
        return await this.createDefault();
      }

      const doc = response.documents[0];
      return this.mapDocument(doc);
    } catch (error: any) {
      appLogger.error('Error fetching site settings:', error);
      throw new AppError('Failed to fetch site settings', 500);
    }
  }

  /**
   * Create default settings
   */
  static async createDefault(): Promise<ISiteSettings> {
    try {
      const doc = await databases.createDocument(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        ID.unique(),
        {
          siteName: 'STUDENT LENS',
          tagline: 'Your Student News Hub',
          contactEmail: 'contact@studentlens.com',
          contactRoom: 'S-21',
          contactRoomFullName: 'Room S-21',
          contactPhone: '(555) 123-4567',
          officeHours: 'Monday-Friday 9AM-5PM',
          socialTwitter: '@studentlens',
          socialInstagram: '@studentlens_official',
          socialFacebook: 'StudentLensOfficial',
        }
      );

      return this.mapDocument(doc);
    } catch (error: any) {
      appLogger.error('Error creating default settings:', error);
      throw new AppError('Failed to create default settings', 500);
    }
  }

  /**
   * Update site settings
   */
  static async update(data: Partial<Omit<ISiteSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ISiteSettings> {
    try {
      // Get existing settings
      const existing = await this.get();

      // Update the document
      const doc = await databases.updateDocument(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        existing.id,
        data
      );

      return this.mapDocument(doc);
    } catch (error: any) {
      appLogger.error('Error updating site settings:', error);
      throw new AppError('Failed to update site settings', 500);
    }
  }

  /**
   * Map Appwrite document to ISiteSettings
   */
  private static mapDocument(doc: any): ISiteSettings {
    return {
      id: doc.$id,
      siteName: doc.siteName || 'STUDENT LENS',
      tagline: doc.tagline || 'Your Student News Hub',
      contactEmail: doc.contactEmail || 'contact@studentlens.com',
      contactRoom: doc.contactRoom || 'S-21',
      contactRoomFullName: doc.contactRoomFullName || 'Room S-21',
      contactPhone: doc.contactPhone || '(555) 123-4567',
      officeHours: doc.officeHours || 'Monday-Friday 9AM-5PM',
      socialTwitter: doc.socialTwitter || '@studentlens',
      socialInstagram: doc.socialInstagram || '@studentlens_official',
      socialFacebook: doc.socialFacebook || 'StudentLensOfficial',
      gamesImage: doc.gamesImage || '',
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    };
  }
}

export default SiteSettings;
