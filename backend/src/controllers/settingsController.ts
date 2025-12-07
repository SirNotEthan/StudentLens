import { Request, Response } from 'express';
import SiteSettings from '../models/SiteSettings';
import { appLogger } from '../services/logger';

/**
 * Get site settings
 */
export const getSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await SiteSettings.get();

    res.json({
      success: true,
      data: {
        settings: {
          siteName: settings.siteName,
          tagline: settings.tagline,
          contact: {
            email: settings.contactEmail,
            room: settings.contactRoom,
            roomFullName: settings.contactRoomFullName,
            officeHours: settings.officeHours,
          },
          images: {
            games: settings.gamesImage,
            featuredNews: settings.featuredNewsImage,
          },
          about: {
            mission: settings.aboutMission,
            whatWeDo: settings.aboutWhatWeDo,
            values: settings.aboutValues,
          },
        },
      },
    });
  } catch (error) {
    appLogger.error('Error fetching site settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site settings',
    });
  }
};

/**
 * Update site settings (Owner only)
 */
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const {
      siteName,
      tagline,
      contactEmail,
      contactRoom,
      contactRoomFullName,
      officeHours,
      gamesImage,
      featuredNewsImage,
      aboutMission,
      aboutWhatWeDo,
      aboutValues,
    } = req.body;

    const settings = await SiteSettings.update({
      ...(siteName !== undefined && { siteName }),
      ...(tagline !== undefined && { tagline }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactRoom !== undefined && { contactRoom }),
      ...(contactRoomFullName !== undefined && { contactRoomFullName }),
      ...(officeHours !== undefined && { officeHours }),
      ...(gamesImage !== undefined && { gamesImage }),
      ...(featuredNewsImage !== undefined && { featuredNewsImage }),
      ...(aboutMission !== undefined && { aboutMission }),
      ...(aboutWhatWeDo !== undefined && { aboutWhatWeDo }),
      ...(aboutValues !== undefined && { aboutValues }),
    });

    appLogger.info(`Site settings updated by user ${(req as any).user?.id || 'unknown'}`);

    res.json({
      success: true,
      message: 'Site settings updated successfully',
      data: {
        settings: {
          siteName: settings.siteName,
          tagline: settings.tagline,
          contact: {
            email: settings.contactEmail,
            room: settings.contactRoom,
            roomFullName: settings.contactRoomFullName,
            officeHours: settings.officeHours,
          },
          images: {
            games: settings.gamesImage,
            featuredNews: settings.featuredNewsImage,
          },
          about: {
            mission: settings.aboutMission,
            whatWeDo: settings.aboutWhatWeDo,
            values: settings.aboutValues,
          },
        },
      },
    });
  } catch (error) {
    appLogger.error('Error updating site settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update site settings',
    });
  }
};
