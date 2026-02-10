import React, { useState } from 'react';
import {
    X, Search, Smartphone, Tablet, Laptop, Monitor, Watch, Tv, Gamepad, Headphones, Printer, Camera, Speaker,
    Facebook, Twitter, Instagram, Linkedin, Youtube, Twitch, Github, Slack, Dribbble, MessageCircle,
    Mail, Globe, Megaphone, ShoppingCart, CreditCard, Truck, Package, Coffee, User, Users, Ticket,
    MapPin, Home, Store, Key, Video, Mic, FileText, Bell, Calendar, Cloud, Wifi, Bluetooth, Battery,
    Activity, Heart, Stethoscope, Pill, Syringe, Ambulance
} from 'lucide-react';

const ICON_LIBRARY = {
    DEVICES: [
        { id: 'smartphone', label: 'Smartphone', icon: Smartphone },
        { id: 'tablet', label: 'Tablet', icon: Tablet },
        { id: 'laptop', label: 'Laptop', icon: Laptop },
        { id: 'desktop', label: 'Desktop', icon: Monitor },
        { id: 'watch', label: 'Smartwatch', icon: Watch },
        { id: 'tv', label: 'Smart TV', icon: Tv },
        { id: 'gamepad', label: 'Console', icon: Gamepad },
        { id: 'headphones', label: 'Audio', icon: Headphones },
        { id: 'camera', label: 'Camera', icon: Camera },
        { id: 'speaker', label: 'Speaker', icon: Speaker },
        { id: 'printer', label: 'Printer', icon: Printer }
    ],
    SOCIAL: [
        { id: 'facebook', label: 'Facebook', icon: Facebook },
        { id: 'twitter', label: 'Twitter', icon: Twitter },
        { id: 'instagram', label: 'Instagram', icon: Instagram },
        { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
        { id: 'youtube', label: 'YouTube', icon: Youtube },
        { id: 'twitch', label: 'Twitch', icon: Twitch },
        { id: 'github', label: 'GitHub', icon: Github },
        { id: 'slack', label: 'Slack', icon: Slack },
        { id: 'dribbble', label: 'Dribbble', icon: Dribbble },
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle } // approx
    ],
    DIGITAL: [
        { id: 'email', label: 'Email', icon: Mail },
        { id: 'website', label: 'Website', icon: Globe },
        { id: 'seo', label: 'SEO/Search', icon: Search },
        { id: 'ads', label: 'Online Ad', icon: Megaphone },
        { id: 'chat', label: 'Live Chat', icon: MessageCircle },
        { id: 'ecom', label: 'E-Commerce', icon: ShoppingCart },
        { id: 'payment', label: 'Payment', icon: CreditCard },
        { id: 'blog', label: 'Blog', icon: FileText },
        { id: 'video', label: 'Video Call', icon: Video },
        { id: 'podcast', label: 'Podcast', icon: Mic },
        { id: 'push', label: 'Push Notif', icon: Bell }
    ],
    PHYSICAL: [
        { id: 'store', label: 'In-Store', icon: Store },
        { id: 'home', label: 'Direct Mail', icon: Home },
        { id: 'event', label: 'Event', icon: Users },
        { id: 'face', label: 'Face-to-Face', icon: User },
        { id: 'delivery', label: 'Delivery', icon: Truck },
        { id: 'package', label: 'Packaging', icon: Package },
        { id: 'promo', label: 'Promotion', icon: Ticket },
        { id: 'location', label: 'OOH / Location', icon: MapPin },
        { id: 'kiosk', label: 'Kiosk', icon: Key } // proxy
    ],
    HEALTHCARE: [
        { id: 'activity', label: 'Activity', icon: Activity },
        { id: 'health', label: 'Health', icon: Heart },
        { id: 'checkup', label: 'Checkup', icon: Stethoscope },
        { id: 'meds', label: 'Medication', icon: Pill },
        { id: 'vaccine', label: 'Vaccine', icon: Syringe },
        { id: 'emergency', label: 'Emergency', icon: Ambulance }
    ]
};

export function ChannelSelectorModal({ isOpen, onClose, onSelect, selectedChannels = [] }) {
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const selectedIds = selectedChannels.map(c => c.id);

    // Flatten and Filter
    const filterIcons = (category) => {
        return category.filter(item => item.label.toLowerCase().includes(search.toLowerCase()));
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '12px', width: '800px', maxWidth: '95%', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
                    <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#1e293b' }}>Add Channels</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                </div>

                {/* Subheader / Search */}
                <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search channels..."
                            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95em', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {Object.entries(ICON_LIBRARY).map(([category, items]) => {
                        const filtered = filterIcons(items);
                        if (filtered.length === 0) return null;

                        return (
                            <div key={category} style={{ marginBottom: '30px' }}>
                                <div style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#94a3b8', marginBottom: '15px', letterSpacing: '1px' }}>
                                    {category} ({filtered.length})
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '20px' }}>
                                    {filtered.map(item => {
                                        const isSelected = selectedIds.includes(item.id);
                                        const Icon = item.icon;
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => onSelect(item)}
                                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '8px' }}
                                            >
                                                <div style={{
                                                    width: '56px', height: '56px', borderRadius: '50%',
                                                    background: isSelected ? '#10B981' : '#334155', // Teal if selected, Dark Gray default (as per screenshot 4 bottom) or Red? 
                                                    // Screenshot 1 shows Red circles. Screenshot 3 shows Teal for selections. 
                                                    // I will use DARK GRAY for library, RED for Final. 
                                                    // Actually screenshot 4 shows Dark Gray circles in library. selection makes them Teal?
                                                    // I'll make selected Teal in library.
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', transition: 'all 0.2s',
                                                    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                                }}>
                                                    <Icon size={24} />
                                                </div>
                                                <div style={{ fontSize: '0.75em', textAlign: 'center', color: isSelected ? '#10B981' : '#64748b', fontWeight: isSelected ? 'bold' : 'normal' }}>
                                                    {item.label}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}

export const getLucideIcon = (id) => {
    // Helper used by canvas to render the icon string
    for (const cat in ICON_LIBRARY) {
        const found = ICON_LIBRARY[cat].find(i => i.id === id);
        if (found) return found.icon;
    }
    return Smartphone; // default
};
