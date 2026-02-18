
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    Search, Plus, LayoutTemplate, Tag, Users, Briefcase, Heart, DollarSign, ShoppingCart, Zap, TrendingUp, Star, Building2, CreditCard, PiggyBank, Landmark
} from 'lucide-react';
import './CxPersonaBuilder.css'; // Reuse styles

// Built-in Complex Persona Templates
const BUILTIN_TEMPLATES = [
    {
        id: 'enterprise-decision-maker',
        title: 'Enterprise Decision Maker',
        category: 'B2B',
        description: 'C-level executive in large enterprise seeking strategic solutions with proven ROI and scalability.',
        is_system: true,
        icon: Briefcase,
        color: '#3b82f6',
        data: {
            demographics: {
                age_range: '45-60',
                income_bracket: '$200K+',
                education: 'MBA or equivalent',
                job_title: 'CTO, CIO, VP of Technology',
                company_size: '1000+ employees',
                industry: 'Enterprise Technology'
            },
            psychographics: {
                values: ['Innovation', 'ROI', 'Risk Mitigation', 'Scalability'],
                pain_points: ['Legacy system integration', 'Budget constraints', 'Change management', 'Vendor lock-in'],
                goals: ['Digital transformation', 'Cost optimization', 'Competitive advantage'],
                personality: 'Analytical, risk-averse, strategic thinker'
            },
            behavioral: {
                preferred_channels: ['LinkedIn', 'Industry conferences', 'Analyst reports', 'Peer recommendations'],
                decision_factors: ['ROI analysis', 'Case studies', 'Vendor reputation', 'Support quality'],
                buying_cycle: '6-18 months',
                content_preferences: ['Whitepapers', 'Webinars', 'Executive briefings']
            },
            engagement: {
                communication_style: 'Professional, data-driven, concise',
                best_contact_time: 'Weekdays 9-11 AM',
                response_rate: 'Low (selective)',
                preferred_meeting_format: 'Virtual executive briefing'
            }
        }
    },
    {
        id: 'smb-owner',
        title: 'SMB Owner/Operator',
        category: 'B2B',
        description: 'Small business owner wearing multiple hats, seeking affordable and easy-to-use solutions.',
        is_system: true,
        icon: Users,
        color: '#10b981',
        data: {
            demographics: {
                age_range: '30-50',
                income_bracket: '$60K-$150K',
                education: 'Bachelor\'s degree or self-taught',
                job_title: 'Owner, Founder, Managing Director',
                company_size: '1-50 employees',
                industry: 'Various SMB sectors'
            },
            psychographics: {
                values: ['Affordability', 'Simplicity', 'Quick wins', 'Personal service'],
                pain_points: ['Limited budget', 'Time constraints', 'Technical complexity', 'Resource limitations'],
                goals: ['Business growth', 'Efficiency', 'Customer retention'],
                personality: 'Pragmatic, hands-on, resourceful'
            },
            behavioral: {
                preferred_channels: ['Google search', 'Facebook', 'Email', 'Word of mouth'],
                decision_factors: ['Price', 'Ease of use', 'Quick implementation', 'Customer reviews'],
                buying_cycle: '1-3 months',
                content_preferences: ['How-to guides', 'Video tutorials', 'Free trials']
            },
            engagement: {
                communication_style: 'Friendly, straightforward, practical',
                best_contact_time: 'Evenings and weekends',
                response_rate: 'Medium',
                preferred_meeting_format: 'Phone call or quick demo'
            }
        }
    },
    {
        id: 'millennial-shopper',
        title: 'Digital-Native Millennial',
        category: 'E-commerce',
        description: 'Tech-savvy millennial who values experiences, sustainability, and authentic brand connections.',
        is_system: true,
        icon: ShoppingCart,
        color: '#f59e0b',
        data: {
            demographics: {
                age_range: '28-42',
                income_bracket: '$50K-$100K',
                education: 'College educated',
                job_title: 'Professional, Manager',
                location: 'Urban/Suburban',
                family_status: 'Single or young family'
            },
            psychographics: {
                values: ['Sustainability', 'Authenticity', 'Convenience', 'Social responsibility'],
                pain_points: ['Information overload', 'Trust issues', 'Time scarcity'],
                goals: ['Work-life balance', 'Personal growth', 'Meaningful purchases'],
                personality: 'Socially conscious, experience-driven, digitally fluent'
            },
            behavioral: {
                preferred_channels: ['Instagram', 'TikTok', 'Mobile apps', 'Influencer recommendations'],
                decision_factors: ['Reviews', 'Brand values', 'User experience', 'Social proof'],
                buying_cycle: 'Impulse to 2 weeks',
                content_preferences: ['Video content', 'User-generated content', 'Stories']
            },
            engagement: {
                communication_style: 'Casual, visual, interactive',
                best_contact_time: 'Evenings 7-10 PM',
                response_rate: 'High on mobile',
                preferred_meeting_format: 'Chat or DM'
            }
        }
    },
    {
        id: 'gen-z-consumer',
        title: 'Gen Z Trendsetter',
        category: 'E-commerce',
        description: 'Values-driven Gen Z consumer seeking authentic brands that align with their social and environmental values.',
        is_system: true,
        icon: TrendingUp,
        color: '#ec4899',
        data: {
            demographics: {
                age_range: '18-27',
                income_bracket: '$20K-$60K',
                education: 'College student or recent graduate',
                job_title: 'Entry-level, Freelancer, Student',
                location: 'Urban, Digital-first',
                family_status: 'Single'
            },
            psychographics: {
                values: ['Diversity', 'Mental health', 'Climate action', 'Transparency'],
                pain_points: ['Financial insecurity', 'Information authenticity', 'FOMO'],
                goals: ['Self-expression', 'Community building', 'Making an impact'],
                personality: 'Activist, creative, skeptical of traditional marketing'
            },
            behavioral: {
                preferred_channels: ['TikTok', 'YouTube', 'Discord', 'Twitch', 'BeReal'],
                decision_factors: ['Peer recommendations', 'Creator endorsements', 'Brand activism', 'Value for money'],
                buying_cycle: 'Very short (hours to days)',
                content_preferences: ['Short-form video', 'Memes', 'Live streams', 'Interactive content']
            },
            engagement: {
                communication_style: 'Authentic, unfiltered, meme-fluent',
                best_contact_time: 'Late evening 9 PM-1 AM',
                response_rate: 'Very high on preferred platforms',
                preferred_meeting_format: 'DM or comment interaction'
            }
        }
    },
    {
        id: 'healthcare-patient',
        title: 'Proactive Health Seeker',
        category: 'Healthcare',
        description: 'Health-conscious individual actively managing their wellness with technology and preventive care.',
        is_system: true,
        icon: Heart,
        color: '#ef4444',
        data: {
            demographics: {
                age_range: '35-55',
                income_bracket: '$70K-$150K',
                education: 'College educated',
                job_title: 'Professional',
                location: 'Suburban',
                family_status: 'Married with children'
            },
            psychographics: {
                values: ['Prevention', 'Quality of life', 'Family health', 'Evidence-based care'],
                pain_points: ['Healthcare costs', 'Access to specialists', 'Coordinating care', 'Health literacy'],
                goals: ['Longevity', 'Wellness', 'Disease prevention'],
                personality: 'Proactive, research-oriented, health-conscious'
            },
            behavioral: {
                preferred_channels: ['Health apps', 'Patient portals', 'Email', 'Telehealth'],
                decision_factors: ['Provider credentials', 'Patient reviews', 'Insurance coverage', 'Convenience'],
                buying_cycle: 'Immediate for urgent, planned for preventive',
                content_preferences: ['Medical articles', 'Video explanations', 'Patient testimonials']
            },
            engagement: {
                communication_style: 'Informative, empathetic, professional',
                best_contact_time: 'Weekday mornings or lunch',
                response_rate: 'High for health-related',
                preferred_meeting_format: 'Telehealth or in-person'
            }
        }
    },
    {
        id: 'fintech-early-adopter',
        title: 'FinTech Early Adopter',
        category: 'Finance',
        description: 'Tech-savvy investor seeking innovative financial tools for wealth building and portfolio management.',
        is_system: true,
        icon: DollarSign,
        color: '#8b5cf6',
        data: {
            demographics: {
                age_range: '25-40',
                income_bracket: '$80K-$200K',
                education: 'Bachelor\'s or Master\'s degree',
                job_title: 'Tech professional, Entrepreneur',
                location: 'Urban tech hubs',
                family_status: 'Single or DINK'
            },
            psychographics: {
                values: ['Financial independence', 'Innovation', 'Transparency', 'Control'],
                pain_points: ['High fees', 'Limited investment options', 'Poor UX', 'Lack of automation'],
                goals: ['Wealth accumulation', 'Portfolio diversification', 'Passive income'],
                personality: 'Analytical, risk-tolerant, tech-forward'
            },
            behavioral: {
                preferred_channels: ['Mobile apps', 'Reddit', 'Twitter/X', 'Financial podcasts'],
                decision_factors: ['Fees', 'Features', 'Security', 'User interface', 'API access'],
                buying_cycle: '1-4 weeks',
                content_preferences: ['Data visualizations', 'Market analysis', 'Educational content']
            },
            engagement: {
                communication_style: 'Data-driven, technical, direct',
                best_contact_time: 'Evenings after market close',
                response_rate: 'High on mobile',
                preferred_meeting_format: 'App-based chat or email'
            }
        }
    },
    {
        id: 'saas-power-user',
        title: 'SaaS Power User',
        category: 'SaaS',
        description: 'Product manager or team lead seeking powerful, integrated tools to optimize team productivity.',
        is_system: true,
        icon: Zap,
        color: '#06b6d4',
        data: {
            demographics: {
                age_range: '28-45',
                income_bracket: '$80K-$150K',
                education: 'Bachelor\'s degree',
                job_title: 'Product Manager, Team Lead, Operations Manager',
                company_size: '50-500 employees',
                industry: 'Tech, Startups, Digital agencies'
            },
            psychographics: {
                values: ['Efficiency', 'Integration', 'Collaboration', 'Innovation'],
                pain_points: ['Tool sprawl', 'Context switching', 'Onboarding friction', 'Data silos'],
                goals: ['Team productivity', 'Process optimization', 'Stakeholder visibility'],
                personality: 'Organized, collaborative, optimization-focused'
            },
            behavioral: {
                preferred_channels: ['Product Hunt', 'Slack communities', 'LinkedIn', 'Tech blogs'],
                decision_factors: ['Integrations', 'Pricing model', 'User experience', 'Customer support'],
                buying_cycle: '2-8 weeks',
                content_preferences: ['Product demos', 'Use cases', 'Comparison guides', 'Community forums']
            },
            engagement: {
                communication_style: 'Collaborative, solution-oriented, technical',
                best_contact_time: 'Weekdays 10 AM-4 PM',
                response_rate: 'High during work hours',
                preferred_meeting_format: 'Screen share demo or trial'
            }
        }
    },
    {
        id: 'luxury-buyer',
        title: 'Affluent Luxury Buyer',
        category: 'Retail',
        description: 'High-net-worth individual seeking exclusive, premium experiences and personalized service.',
        is_system: true,
        icon: Star,
        color: '#d97706',
        data: {
            demographics: {
                age_range: '40-65',
                income_bracket: '$250K+',
                education: 'Advanced degree',
                job_title: 'Executive, Business Owner, Investor',
                location: 'Affluent neighborhoods, Global',
                family_status: 'Married, Established family'
            },
            psychographics: {
                values: ['Quality', 'Exclusivity', 'Heritage', 'Status', 'Craftsmanship'],
                pain_points: ['Lack of personalization', 'Poor service', 'Accessibility', 'Authenticity concerns'],
                goals: ['Lifestyle enhancement', 'Investment pieces', 'Unique experiences'],
                personality: 'Discerning, sophisticated, quality-focused'
            },
            behavioral: {
                preferred_channels: ['Personal relationships', 'Exclusive events', 'Concierge services', 'Private sales'],
                decision_factors: ['Brand heritage', 'Exclusivity', 'Personalization', 'Service quality'],
                buying_cycle: 'Variable (impulse to months)',
                content_preferences: ['Private viewings', 'Personalized presentations', 'Curated experiences']
            },
            engagement: {
                communication_style: 'Refined, personalized, discreet',
                best_contact_time: 'By appointment',
                response_rate: 'Medium (selective)',
                preferred_meeting_format: 'In-person, private consultation'
            }
        }
    },
    // === BANKING PERSONAS ===
    {
        id: 'retail-banking-millennial',
        title: 'Digital-First Banking Millennial',
        category: 'Banking',
        description: 'Tech-savvy millennial seeking seamless digital banking with mobile-first features, budgeting tools, and instant transactions.',
        is_system: true,
        icon: CreditCard,
        color: '#0ea5e9',
        data: {
            demographics: {
                age_range: '25-40',
                income_bracket: '$45K-$85K',
                education: 'Bachelor\'s degree',
                job_title: 'Professional, Manager, Entrepreneur',
                location: 'Urban/Suburban',
                family_status: 'Single or young family',
                employment_type: 'Full-time employee or freelancer'
            },
            psychographics: {
                values: ['Convenience', 'Transparency', 'Financial wellness', 'Innovation', 'Instant gratification'],
                pain_points: ['Hidden fees', 'Branch visit requirements', 'Slow transfers', 'Poor mobile UX', 'Lack of financial insights'],
                goals: ['Build emergency fund', 'Pay off student loans', 'Save for home', 'Improve credit score'],
                personality: 'Tech-savvy, impatient, value-conscious, financially aware',
                financial_literacy: 'Moderate to high'
            },
            behavioral: {
                preferred_channels: ['Mobile app', 'Chatbot', 'Social media', 'Email'],
                decision_factors: ['No fees', 'Mobile features', 'Instant transfers', 'Budgeting tools', 'Customer reviews'],
                banking_habits: ['Checks balance daily', 'Uses mobile deposit', 'P2P payments', 'Automated savings'],
                product_usage: ['Checking account', 'Savings account', 'Credit card', 'Mobile wallet'],
                switching_likelihood: 'High (willing to switch for better features)'
            },
            financial_profile: {
                average_balance: '$5K-$15K',
                monthly_transactions: '40-60',
                credit_score_range: '650-750',
                debt_level: 'Moderate (student loans, credit cards)',
                investment_interest: 'Growing (robo-advisors, crypto)',
                savings_rate: '10-15% of income'
            },
            engagement: {
                communication_style: 'Casual, quick, visual, emoji-friendly',
                best_contact_time: 'Evenings 6-10 PM',
                response_rate: 'Very high on mobile',
                preferred_meeting_format: 'In-app chat or video call',
                notification_preferences: 'Push notifications, real-time alerts'
            }
        }
    },
    {
        id: 'wealth-management-client',
        title: 'High-Net-Worth Investor',
        category: 'Banking',
        description: 'Affluent professional seeking personalized wealth management, tax optimization, and estate planning services.',
        is_system: true,
        icon: Landmark,
        color: '#7c3aed',
        data: {
            demographics: {
                age_range: '45-65',
                income_bracket: '$250K-$1M+',
                education: 'Advanced degree (MBA, JD, MD)',
                job_title: 'Executive, Business Owner, Partner',
                location: 'Affluent suburbs, Urban penthouses',
                family_status: 'Married with children',
                employment_type: 'Senior executive or business owner'
            },
            psychographics: {
                values: ['Wealth preservation', 'Legacy planning', 'Tax efficiency', 'Exclusivity', 'Expertise'],
                pain_points: ['Complex tax situations', 'Estate planning', 'Multi-generational wealth transfer', 'Investment diversification'],
                goals: ['Preserve wealth', 'Minimize tax burden', 'Fund retirement', 'Leave legacy', 'Philanthropic impact'],
                personality: 'Sophisticated, risk-aware, long-term focused, privacy-conscious',
                financial_literacy: 'Very high'
            },
            behavioral: {
                preferred_channels: ['Dedicated advisor', 'Private banking center', 'Secure portal', 'Phone'],
                decision_factors: ['Advisor expertise', 'Track record', 'Personalized service', 'Tax strategies', 'Exclusive access'],
                banking_habits: ['Quarterly reviews', 'Multi-bank relationships', 'International transactions', 'Trust accounts'],
                product_usage: ['Private banking', 'Investment portfolio', 'Trust services', 'Premium credit cards', 'Concierge services'],
                switching_likelihood: 'Low (values relationship continuity)'
            },
            financial_profile: {
                average_balance: '$500K-$5M+',
                monthly_transactions: '20-40',
                credit_score_range: '750-850',
                debt_level: 'Low to moderate (strategic debt)',
                investment_interest: 'Very high (diversified portfolio)',
                savings_rate: '20-40% of income',
                investment_portfolio: 'Stocks, bonds, real estate, alternative investments'
            },
            engagement: {
                communication_style: 'Professional, sophisticated, data-driven',
                best_contact_time: 'Weekdays 9 AM-5 PM, by appointment',
                response_rate: 'Medium (selective)',
                preferred_meeting_format: 'In-person at private banking center or home office',
                notification_preferences: 'Email summaries, quarterly reports'
            }
        }
    },
    {
        id: 'small-business-banker',
        title: 'Small Business Owner',
        category: 'Banking',
        description: 'Entrepreneur managing business finances, seeking cash flow solutions, merchant services, and business credit.',
        is_system: true,
        icon: Building2,
        color: '#059669',
        data: {
            demographics: {
                age_range: '35-55',
                income_bracket: '$75K-$200K',
                education: 'Bachelor\'s degree or equivalent experience',
                job_title: 'Business Owner, Founder, Managing Partner',
                location: 'Suburban, Small cities',
                family_status: 'Married with children',
                employment_type: 'Self-employed',
                business_size: '1-25 employees',
                business_revenue: '$500K-$5M annually'
            },
            psychographics: {
                values: ['Cash flow stability', 'Growth', 'Simplicity', 'Relationship banking', 'Local support'],
                pain_points: ['Cash flow gaps', 'Payment processing fees', 'Payroll management', 'Tax complexity', 'Access to credit'],
                goals: ['Grow business', 'Manage cash flow', 'Expand operations', 'Hire employees', 'Secure financing'],
                personality: 'Pragmatic, hands-on, relationship-oriented, time-constrained',
                financial_literacy: 'High in business finance'
            },
            behavioral: {
                preferred_channels: ['Business banker', 'Online banking', 'Mobile app', 'Branch visits'],
                decision_factors: ['Fees', 'Credit availability', 'Merchant services', 'Payroll integration', 'Local presence'],
                banking_habits: ['Daily balance checks', 'Weekly transfers', 'Monthly reconciliation', 'Seasonal borrowing'],
                product_usage: ['Business checking', 'Line of credit', 'Merchant services', 'Payroll services', 'Business credit card'],
                switching_likelihood: 'Medium (values relationship but price-sensitive)'
            },
            financial_profile: {
                average_balance: '$25K-$150K',
                monthly_transactions: '100-300',
                credit_score_range: '680-780',
                debt_level: 'Moderate to high (business loans)',
                investment_interest: 'Moderate (focused on business)',
                savings_rate: 'Variable (seasonal)',
                business_credit_needs: 'Line of credit, equipment financing, SBA loans'
            },
            engagement: {
                communication_style: 'Direct, practical, results-oriented',
                best_contact_time: 'Early mornings or late afternoons',
                response_rate: 'High for business-critical issues',
                preferred_meeting_format: 'In-person at branch or business location',
                notification_preferences: 'Email alerts, SMS for urgent matters'
            }
        }
    },
    {
        id: 'gen-z-digital-native',
        title: 'Gen Z Digital Banking Native',
        category: 'Banking',
        description: 'Young adult seeking gamified banking, social features, financial education, and crypto-friendly services.',
        is_system: true,
        icon: TrendingUp,
        color: '#ec4899',
        data: {
            demographics: {
                age_range: '18-27',
                income_bracket: '$25K-$55K',
                education: 'College student or recent graduate',
                job_title: 'Entry-level, Gig worker, Student',
                location: 'Urban, College towns',
                family_status: 'Single',
                employment_type: 'Part-time, gig economy, or entry-level'
            },
            psychographics: {
                values: ['Financial independence', 'Transparency', 'Social responsibility', 'Innovation', 'Community'],
                pain_points: ['Student debt', 'Low income', 'Financial anxiety', 'Traditional banking complexity', 'Lack of guidance'],
                goals: ['Build credit', 'Pay off debt', 'Start investing', 'Financial literacy', 'Side hustle income'],
                personality: 'Digital-first, socially conscious, skeptical of institutions, community-oriented',
                financial_literacy: 'Low to moderate (eager to learn)'
            },
            behavioral: {
                preferred_channels: ['Mobile app', 'TikTok', 'Discord', 'Instagram', 'In-app chat'],
                decision_factors: ['No fees', 'Easy signup', 'Financial education', 'Crypto support', 'Social features', 'Influencer endorsements'],
                banking_habits: ['Mobile-only', 'Micro-savings', 'Round-up features', 'P2P payments', 'Fractional investing'],
                product_usage: ['Digital checking', 'Savings challenges', 'Debit card', 'Investment app', 'Crypto wallet'],
                switching_likelihood: 'Very high (low loyalty, app-hopper)'
            },
            financial_profile: {
                average_balance: '$500-$3K',
                monthly_transactions: '30-50',
                credit_score_range: '600-700 or no credit history',
                debt_level: 'High (student loans) or none',
                investment_interest: 'Very high (stocks, crypto, NFTs)',
                savings_rate: '5-10% of income (irregular)',
                investment_focus: 'Fractional shares, crypto, meme stocks'
            },
            engagement: {
                communication_style: 'Casual, authentic, meme-friendly, educational',
                best_contact_time: 'Late evenings 8 PM-midnight',
                response_rate: 'Very high on mobile platforms',
                preferred_meeting_format: 'In-app chat, video tutorials',
                notification_preferences: 'Push notifications, gamification alerts, achievement badges'
            }
        }
    },
    {
        id: 'mortgage-homebuyer',
        title: 'First-Time Homebuyer',
        category: 'Banking',
        description: 'Young professional navigating the mortgage process, seeking guidance, competitive rates, and digital tools.',
        is_system: true,
        icon: PiggyBank,
        color: '#f59e0b',
        data: {
            demographics: {
                age_range: '28-38',
                income_bracket: '$65K-$120K',
                education: 'Bachelor\'s degree',
                job_title: 'Professional, Manager',
                location: 'Suburban, Growing cities',
                family_status: 'Married or partnered, planning family',
                employment_type: 'Full-time employee',
                employment_stability: '2+ years in current job'
            },
            psychographics: {
                values: ['Homeownership', 'Stability', 'Family security', 'Financial responsibility', 'Long-term planning'],
                pain_points: ['Down payment savings', 'Mortgage complexity', 'Credit requirements', 'Market competition', 'Closing costs'],
                goals: ['Buy first home', 'Build equity', 'Secure low rate', 'Understand process', 'Avoid mistakes'],
                personality: 'Cautious, research-oriented, goal-focused, anxious about big decisions',
                financial_literacy: 'Moderate (learning about mortgages)'
            },
            behavioral: {
                preferred_channels: ['Mortgage specialist', 'Online calculators', 'Email', 'Educational webinars', 'YouTube'],
                decision_factors: ['Interest rate', 'Down payment options', 'Closing costs', 'Pre-approval speed', 'Lender reputation'],
                banking_habits: ['Aggressive saving', 'Credit monitoring', 'Budget tracking', 'Rate shopping'],
                product_usage: ['High-yield savings', 'Checking account', 'Credit card (for rewards)', 'Mortgage pre-approval'],
                switching_likelihood: 'Medium (will shop for best mortgage rate)'
            },
            financial_profile: {
                average_balance: '$15K-$50K (saving for down payment)',
                monthly_transactions: '25-40',
                credit_score_range: '680-760',
                debt_level: 'Low to moderate (car loan, student loans)',
                investment_interest: 'Moderate (focused on home savings)',
                savings_rate: '15-25% of income',
                home_budget: '$250K-$500K',
                down_payment_target: '10-20%'
            },
            engagement: {
                communication_style: 'Informative, supportive, educational',
                best_contact_time: 'Evenings and weekends',
                response_rate: 'Very high (actively seeking information)',
                preferred_meeting_format: 'Virtual consultation or in-person at branch',
                notification_preferences: 'Email updates, rate alerts, milestone reminders'
            }
        }
    },
    {
        id: 'retirement-planner',
        title: 'Pre-Retirement Planner',
        category: 'Banking',
        description: 'Professional approaching retirement, seeking wealth preservation, income planning, and legacy strategies.',
        is_system: true,
        icon: Landmark,
        color: '#6366f1',
        data: {
            demographics: {
                age_range: '55-65',
                income_bracket: '$100K-$250K',
                education: 'Bachelor\'s or advanced degree',
                job_title: 'Senior Manager, Director, Professional',
                location: 'Suburban, Retirement destinations',
                family_status: 'Married, adult children',
                employment_type: 'Full-time, considering phased retirement'
            },
            psychographics: {
                values: ['Financial security', 'Income stability', 'Healthcare coverage', 'Legacy planning', 'Lifestyle maintenance'],
                pain_points: ['Retirement income gap', 'Healthcare costs', 'Market volatility', 'Longevity risk', 'Tax planning'],
                goals: ['Retire comfortably', 'Generate income', 'Preserve capital', 'Estate planning', 'Healthcare funding'],
                personality: 'Conservative, planning-focused, risk-averse, detail-oriented',
                financial_literacy: 'High'
            },
            behavioral: {
                preferred_channels: ['Financial advisor', 'Retirement seminars', 'Email', 'Phone', 'In-person meetings'],
                decision_factors: ['Income generation', 'Capital preservation', 'Tax efficiency', 'Advisor expertise', 'Fee transparency'],
                banking_habits: ['Regular portfolio reviews', 'Rebalancing', 'RMD planning', 'Estate updates'],
                product_usage: ['IRA/401k rollover', 'Annuities', 'CDs', 'Money market', 'Trust services', 'Health savings account'],
                switching_likelihood: 'Low (values stability and relationships)'
            },
            financial_profile: {
                average_balance: '$250K-$2M+',
                monthly_transactions: '15-30',
                credit_score_range: '750-850',
                debt_level: 'Low (mortgage payoff in progress)',
                investment_interest: 'High (income-focused)',
                savings_rate: '20-30% of income',
                retirement_assets: '$500K-$3M',
                target_retirement_income: '$60K-$150K annually'
            },
            engagement: {
                communication_style: 'Professional, detailed, reassuring',
                best_contact_time: 'Weekday mornings 9 AM-12 PM',
                response_rate: 'High for retirement-related topics',
                preferred_meeting_format: 'In-person quarterly reviews',
                notification_preferences: 'Email newsletters, quarterly statements, tax documents'
            }
        }
    }
];

export default function CxPersonaTemplates({ onSelectTemplate, onEditTemplate }) {
    const { t } = useTranslation();
    const [apiTemplates, setApiTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = () => {
        setLoading(true);
        axios.get('/api/cx-persona-templates')
            .then(res => setApiTemplates(res.data || []))
            .catch(err => {
                console.error('Failed to load API templates:', err);
                setApiTemplates([]);
            })
            .finally(() => setLoading(false));
    };

    // Combine built-in and API templates
    const allTemplates = [...BUILTIN_TEMPLATES, ...apiTemplates];
    const categories = ['All', ...new Set(allTemplates.map(t => t.category).filter(Boolean))];

    const filtered = allTemplates.filter(tmpl => {
        const matchSearch = tmpl.title.toLowerCase().includes(search.toLowerCase()) ||
            tmpl.description.toLowerCase().includes(search.toLowerCase());
        const matchCat = categoryFilter === 'All' || tmpl.category === categoryFilter;
        return matchSearch && matchCat;
    });

    const getCategoryIcon = (category) => {
        const iconMap = {
            'B2B': Briefcase,
            'E-commerce': ShoppingCart,
            'Healthcare': Heart,
            'Finance': DollarSign,
            'SaaS': Zap,
            'Retail': Star,
            'Banking': Landmark
        };
        return iconMap[category] || LayoutTemplate;
    };

    return (
        <div className="persona-builder-container" style={{ padding: '30px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '36px', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                    <LayoutTemplate size={40} />
                    Persona Templates Library
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
                    Choose from professionally crafted persona templates to accelerate your customer understanding
                </p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: '1 1 300px', minWidth: '250px', display: 'flex', alignItems: 'center', background: 'white', border: 'none', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    <Search size={20} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', paddingLeft: '12px', width: '100%', fontSize: '15px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '24px',
                                border: 'none',
                                background: categoryFilter === cat ? 'white' : 'rgba(255,255,255,0.2)',
                                color: categoryFilter === cat ? '#667eea' : 'white',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                boxShadow: categoryFilter === cat ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', paddingBottom: '40px' }}>
                {loading && apiTemplates.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'white', padding: '40px' }}>
                        Loading templates...
                    </div>
                ) : null}

                {filtered.map(tmpl => {
                    const IconComponent = tmpl.icon || getCategoryIcon(tmpl.category);
                    const cardColor = tmpl.color || '#3b82f6';

                    return (
                        <div
                            key={tmpl.id}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.3s',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                border: '2px solid transparent'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-8px)';
                                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.2)';
                                e.currentTarget.style.borderColor = cardColor;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                e.currentTarget.style.borderColor = 'transparent';
                            }}
                        >
                            {/* Header with gradient */}
                            <div style={{
                                height: '120px',
                                background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}dd 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}>
                                <IconComponent size={48} color="white" strokeWidth={1.5} />
                                {tmpl.is_system && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        background: 'rgba(255,255,255,0.3)',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        color: 'white',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Premium
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        color: cardColor,
                                        background: `${cardColor}15`,
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {tmpl.category}
                                    </span>
                                </div>
                                <h3 style={{
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    margin: '0 0 12px',
                                    color: '#1e293b',
                                    lineHeight: '1.3'
                                }}>
                                    {tmpl.title}
                                </h3>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#64748b',
                                    lineHeight: '1.6',
                                    flex: 1,
                                    margin: 0
                                }}>
                                    {tmpl.description}
                                </p>

                                {/* Attributes preview */}
                                {tmpl.data && (
                                    <div style={{
                                        marginTop: '16px',
                                        paddingTop: '16px',
                                        borderTop: '1px solid #f1f5f9',
                                        display: 'flex',
                                        gap: '8px',
                                        flexWrap: 'wrap'
                                    }}>
                                        {Object.keys(tmpl.data).slice(0, 3).map(key => (
                                            <span key={key} style={{
                                                fontSize: '11px',
                                                padding: '3px 8px',
                                                background: '#f8fafc',
                                                color: '#475569',
                                                borderRadius: '4px',
                                                fontWeight: '500'
                                            }}>
                                                {key}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action button */}
                            <div style={{ padding: '20px', paddingTop: '0' }}>
                                <button
                                    onClick={() => onSelectTemplate(tmpl)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: cardColor,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '15px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                        e.currentTarget.style.boxShadow = `0 4px 12px ${cardColor}40`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    Use This Template
                                </button>
                            </div>
                        </div>
                    );
                })}

                {filtered.length === 0 && !loading && (
                    <div style={{
                        gridColumn: '1/-1',
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        color: 'white'
                    }}>
                        <Search size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ margin: '0 0 8px', fontSize: '20px' }}>No templates found</h3>
                        <p style={{ margin: 0, opacity: 0.8 }}>Try adjusting your search or filter criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
}
