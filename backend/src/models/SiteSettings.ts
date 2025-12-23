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
  officeHours: string;
  gamesImage?: string;
  featuredNewsImage?: string;
  aboutMission?: string;
  aboutWhatWeDo?: string;
  aboutValues?: string;
  createdAt: string;
  updatedAt: string;
}

export class SiteSettings {
  static async get(): Promise<ISiteSettings> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        [Query.limit(1)]
      );

      if (response.documents.length === 0) {
        return await this.createDefault();
      }

      const doc = response.documents[0];
      return this.mapDocument(doc);
    } catch (error: any) {
      appLogger.error('Error fetching site settings:', error);
      throw new AppError('Failed to fetch site settings', 500);
    }
  }

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
          officeHours: 'Monday-Friday 9AM-5PM',
          aboutMission: 'Student Lens is dedicated to amplifying student voices and fostering a vibrant community of young writers, thinkers, and storytellers.',
          aboutWhatWeDo: 'We provide a digital publishing platform where students can share articles, engage with content, connect with fellow writers, and stay informed about campus news.',
          aboutValues: 'Authenticity, Community, Growth, Inclusivity',
        }
      );

      return this.mapDocument(doc);
    } catch (error: any) {
      appLogger.error('Error creating default settings:', error);
      throw new AppError('Failed to create default settings', 500);
    }
  }

  static async update(data: Partial<Omit<ISiteSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ISiteSettings> {
    try {
      const existing = await this.get();

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

  private static mapDocument(doc: any): ISiteSettings {
    return {
      id: doc.$id,
      siteName: doc.siteName || 'STUDENT LENS',
      tagline: doc.tagline || 'Your Student News Hub',
      contactEmail: doc.contactEmail || 'contact@studentlens.com',
      contactRoom: doc.contactRoom || 'S-21',
      contactRoomFullName: doc.contactRoomFullName || 'Room S-21',
      officeHours: doc.officeHours || 'Monday-Friday 9AM-5PM',
      gamesImage: doc.gamesImage || '',
      featuredNewsImage: doc.featuredNewsImage || '',
      aboutMission: doc.aboutMission || 'Student Lens is dedicated to amplifying student voices and fostering a vibrant community of young writers, thinkers, and storytellers.',
      aboutWhatWeDo: doc.aboutWhatWeDo || 'We provide a digital publishing platform where students can share articles, engage with content, connect with fellow writers, and stay informed about campus news.',
      aboutValues: doc.aboutValues || 'Authenticity, Community, Growth, Inclusivity',
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    };
  }
}

export default SiteSettings;
