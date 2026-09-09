import { prisma } from '@/config/database';
import { AppError } from '@/utils/AppError';

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
  aboutLegacy?: string;
  aboutLegacyIntro?: string;
  aboutGetInvolved?: string;
  applyIntro?: string;
  applyBenefits?: string;
  applyTimeline?: string;
  termsOfService?: string;
  privacyPolicy?: string;
  createdAt: string;
  updatedAt: string;
}

const toIso = (value?: Date | string | null): string => value ? (value instanceof Date ? value.toISOString() : new Date(value).toISOString()) : new Date().toISOString();

const mapSettings = (doc: any): ISiteSettings => ({
  id: doc.id,
  siteName: doc.siteName || 'STUDENT LENS',
  tagline: doc.tagline || 'Your Student News Hub',
  contactEmail: doc.contactEmail || 'contact@studentlens.com',
  contactRoom: doc.contactRoom || 'S-21',
  contactRoomFullName: doc.contactRoomFullName || 'Room S-21',
  officeHours: doc.officeHours || 'Monday-Friday 9AM-5PM',
  gamesImage: doc.gamesImage || '',
  featuredNewsImage: doc.featuredNewsImage || '',
  aboutMission: doc.aboutMission || '',
  aboutWhatWeDo: doc.aboutWhatWeDo || '',
  aboutValues: doc.aboutValues || '',
  aboutLegacy: doc.aboutLegacy || '',
  aboutLegacyIntro: doc.aboutLegacyIntro || '',
  aboutGetInvolved: doc.aboutGetInvolved || '',
  applyIntro: doc.applyIntro || '',
  applyBenefits: doc.applyBenefits || '',
  applyTimeline: doc.applyTimeline || '',
  termsOfService: doc.termsOfService || '',
  privacyPolicy: doc.privacyPolicy || '',
  createdAt: toIso(doc.createdAt),
  updatedAt: toIso(doc.updatedAt),
});

export class SiteSettings {
  static async get(): Promise<ISiteSettings> {
    const settings = await prisma.siteSettings.findFirst();
    return settings ? mapSettings(settings) : this.createDefault();
  }

  static async createDefault(): Promise<ISiteSettings> {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
    return mapSettings(settings);
  }

  static async update(data: Partial<Omit<ISiteSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ISiteSettings> {
    try {
      await this.createDefault();
      const settings = await prisma.siteSettings.update({
        where: { id: 'singleton' },
        data: data as any,
      });
      return mapSettings(settings);
    } catch (error: any) {
      throw new AppError(`Failed to update site settings: ${error.message}`, 500);
    }
  }
}

export default SiteSettings;
