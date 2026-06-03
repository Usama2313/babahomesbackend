import React from 'react';
import * as SimpleIcons from 'simple-icons';

// Mapping of display names to Simple Icons export keys
  const iconMap = [
    // { name: 'Gmail', key: 'siGmail' },
    // { name: 'TikTok', key: 'siTiktok' },
    // { name: 'Pinterest', key: 'siPinterest' },
    // { name: 'Tumblr', key: 'siTumblr' },
    // { name: 'Discord', key: 'siDiscord' },
    // { name: 'Telegram', key: 'siTelegram' },
    { name: 'TikTok', key: 'siTiktok' },
    { name: 'Twitter', key: 'siTwitter' },
    { name: 'YouTube', key: 'siYoutube' },
    { name: 'Messenger', key: 'siFacebookMessenger' },
    { name: 'Snapchat', key: 'siSnapchat' },
    { name: 'LinkedIn', key: 'siLinkedin' },
    { name: 'WhatsApp', key: 'siWhatsapp' },
    { name: 'Instagram', key: 'siInstagram' },
    { name: 'Facebook', key: 'siFacebook' }
  ];

const SocialIcons = () => (
  <div className="social-icons-bottom">
    {iconMap.map(({ name, key }) => {
      const icon = SimpleIcons[key];
      if (!icon) return null;
      // Insert brand colour via fill attribute and enforce size
      const svg = icon.svg.replace(
        '<svg',
        `<svg fill="#${icon.hex}" width="24" height="24"`
      );
      return (
        <a key={name} href={(() => {
            switch (name) {
              case 'Facebook':
                return 'https://www.facebook.com/profile.php?id=61590762711518';
              case 'WhatsApp':
                return 'https://wa.me/97332271249';
              case 'Instagram':
                return 'https://www.instagram.com/';
              case 'Twitter':
                return 'https://twitter.com/';
              case 'YouTube':
                return 'https://www.youtube.com/';
              case 'LinkedIn':
                return 'https://www.linkedin.com/';
              case 'TikTok':
                return 'https://www.tiktok.com/';
              case 'Messenger':
                return 'https://m.me/';
              case 'Snapchat':
                return 'https://www.snapchat.com/add/';
              default:
                return '#';
            }
          })()}
            aria-label={name}
            title={name}
            target="_blank"
            rel="noreferrer"
          >
          <span
            className="social-icon-3d"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </a>
      );
    })}
  </div>
);

export default SocialIcons;
