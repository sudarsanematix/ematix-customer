export const POPULAR_LOCATIONS = [
  {
    title: 'Marina Beach Promenade',
    subtitle: 'Kamarajar Salai, Triplicane, Chennai',
    distance: '8.4 km',
    duration: '~22 mins',
    tag: 'Tourist Spot',
    tagType: 'tourist',
  },
  {
    title: 'Phoenix Marketcity',
    subtitle: 'Velachery Main Rd, Indira Gandhi Nagar',
    distance: '6.8 km',
    duration: '~18 mins',
    tag: 'Shopping',
    tagType: 'shopping',
  },
  {
    title: 'Chennai Central Railway Station',
    subtitle: 'Park Town, Kannappar Thidal, Chennai',
    distance: '11.2 km',
    duration: '~32 mins',
    tag: 'Transit',
    tagType: 'transit',
  },
  {
    title: 'Anna Nagar Roundtana',
    subtitle: '2nd Ave, Anna Nagar, Chennai',
    distance: '7.5 km',
    duration: '~20 mins',
    tag: 'Commercial',
    tagType: 'commercial',
  },
];

export const SAVED_PLACES = [
  {
    title: 'Home',
    subtitle: '12A Lake View Rd, Nungambakkam',
    tag: 'Home',
    tagType: 'home',
  },
  {
    title: 'Office',
    subtitle: 'Tower 4, Ramanujan IT City, Taramani',
    tag: 'Office',
    tagType: 'work',
  },
  {
    title: 'Anna Nagar Club',
    subtitle: '3rd Ave, Block AA, Anna Nagar',
    tag: 'Club',
  },
];

export const RIDE_VEHICLES = [
  {
    id: 'auto',
    name: 'Ematix Auto',
    badge: 'ECO',
    description: 'Quickest in city traffic',
    seats: 3,
    etaMinutes: 3,
    dropTime: '05:42 PM',
    price: 135,
    originalPrice: 160,
    image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Auto%20rickshaw/3D/auto_rickshaw_3d.png',
  },
  {
    id: 'car',
    name: 'Ematix Car',
    badge: 'AC PRIME',
    description: 'Comfortable AC ride',
    seats: 4,
    etaMinutes: 5,
    dropTime: '05:48 PM',
    price: 260,
    originalPrice: 285,
    image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Automobile/3D/automobile_3d.png',
  },
];

export const PARCEL_VEHICLES = [
  {
    id: 'two-wheeler',
    name: 'Two Wheeler',
    badge: 'Fastest',
    eta: '12 mins',
    description: 'Suitable for small, light packages, instant documents & parcels.',
    price: 79,
    baseFare: 40,
    distanceCharge: 39,
    image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Motor%20scooter/3D/motor_scooter_3d.png',
  },
  {
    id: 'auto',
    name: 'Auto',
    badge: 'Heavy load',
    eta: '18 mins',
    description: 'Suitable for larger boxes, bulky or heavier items (up to 50 kg).',
    price: 155,
    baseFare: 80,
    distanceCharge: 75,
    image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Auto%20rickshaw/3D/auto_rickshaw_3d.png',
  },
];

export const DELIVERY_VEHICLES = [
  {
    id: 'two-wheeler',
    title: 'Two Wheeler',
    subtitle: 'Fastest delivery for light parcels',
    price: 79,
    eta: '12 mins',
    image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Motor%20scooter/3D/motor_scooter_3d.png',
  },
  {
    id: 'auto',
    title: 'Ematix Auto',
    subtitle: 'Bulky boxes or heavy items',
    price: 155,
    eta: '18 mins',
    image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Auto%20rickshaw/3D/auto_rickshaw_3d.png',
  },
];

export const PACKAGE_CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: 'laptop_mac' },
  { id: 'documents', label: 'Documents', icon: 'description' },
  { id: 'food', label: 'Food / Tiffin', icon: 'lunch_dining' },
  { id: 'clothing', label: 'Clothing', icon: 'checkroom' },
  { id: 'groceries', label: 'Groceries', icon: 'shopping_basket' },
];

export const DRIVER_KARTHIK = {
  name: 'Karthik Raja',
  rating: 4.9,
  tripsCount: '1,420+ trips',
  vehicleName: 'Bajaj Compact Auto',
  vehicleNumber: 'TN 09 BK 4829',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces&q=80',
  phone: '+91 94440 12894',
  verifiedBadge: true,
};

export const DRIVER_SURESH = {
  name: 'Suresh Kumar',
  rating: 4.92,
  tripsCount: '2,100+ deliveries',
  deliveriesCount: '2,100+ deliveries',
  vehicleName: 'Honda Activa 6G',
  vehicleNumber: 'TN 07 BV 4120',
  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces&q=80',
  phone: '+91 98765 43210',
  verifiedBadge: true,
};

export const COURIER_SURESH = DRIVER_SURESH;

export const INITIAL_ORDERS = [
  {
    id: 'EM-89240',
    type: 'delivery',
    title: 'Electronics & Document Package',
    pickup: 'Greenways Road, RA Puram',
    dropoff: '12th Cross St, Indiranagar',
    date: 'Today, 06:14 PM',
    time: '06:14 PM',
    status: 'Completed',
    price: 79,
    partnerName: 'Suresh Kumar',
    vehicle: 'Honda Activa 6G',
    rating: 5,
    paymentMethod: 'UPI • GPay',
    fare: { base: 40, distance: 39, surcharge: 0, coupon: null, couponValue: 0, tip: 0 },
  },
  {
    id: 'EMX-88294',
    type: 'ride',
    title: 'City Auto Ride',
    pickup: 'Anna Salai, Mount Road',
    dropoff: 'Marina Bay Promenade',
    date: 'Today, 05:42 PM',
    time: '05:42 PM',
    status: 'Completed',
    price: 130,
    partnerName: 'Karthik Raja',
    vehicle: 'Bajaj Compact Auto',
    rating: 5,
    paymentMethod: 'Google Pay UPI',
    fare: { base: 60, distance: 70, surcharge: 25, coupon: 'EMATIX50', couponValue: 25, tip: 0 },
  },
  {
    id: 'EM-77210',
    type: 'ride',
    title: 'Office Commute',
    pickup: '12A Lake View Rd, Nungambakkam',
    dropoff: 'Ramanujan IT City, Taramani',
    date: 'Yesterday, 09:15 AM',
    time: '09:15 AM',
    status: 'Completed',
    price: 210,
    partnerName: 'Venkatesh R.',
    vehicle: 'Maruti WagonR AC',
    rating: 4.8,
    paymentMethod: 'Paytm UPI',
    fare: { base: 90, distance: 120, surcharge: 0, coupon: null, couponValue: 0, tip: 0 },
  },
];

export const PAST_ORDERS = INITIAL_ORDERS;

export const NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'ride',
    title: 'Your ride is completed',
    message: 'Auto ride from Anna Salai to Marina Bay Promenade ended at 05:42 PM. Thanks for riding with Ematix!',
    time: 'Today, 05:44 PM',
    read: false,
  },
  {
    id: 'n2',
    type: 'delivery',
    title: 'Parcel delivered',
    message: 'Suresh handed over your package to the receiver. OTP verified successfully.',
    time: 'Today, 06:16 PM',
    read: false,
  },
  {
    id: 'n3',
    type: 'offer',
    title: '40% off your next Auto ride',
    message: 'Flat 40% off (up to ₹40) on city Auto rides this weekend. Use code WKND40.',
    time: 'Today, 10:00 AM',
    read: false,
  },
  {
    id: 'n4',
    type: 'safety',
    title: 'Safety tip',
    message: 'Share your live trip with an emergency contact for extra peace of mind on night rides.',
    time: 'Yesterday, 09:12 PM',
    read: true,
  },
  {
    id: 'n5',
    type: 'ride',
    title: 'Driver on the way',
    message: 'Karthik was 2 mins away and reached your pickup on time for your office commute.',
    time: 'Yesterday, 09:02 AM',
    read: true,
  },
  {
    id: 'n6',
    type: 'offer',
    title: 'Ematix Points earned',
    message: 'You earned 40 Ematix Points for your last delivery. Redeem them for ride discounts.',
    time: 'Sep 19, 06:30 PM',
    read: true,
  },
];

export const TRAVEL_PROMPTS = [
  {
    id: 'day-trip',
    label: 'Plan a day trip in Chennai',
    icon: 'wb-sunny',
  },
  {
    id: 'weekend',
    label: 'Plan a 2-day weekend trip',
    icon: 'beach-access',
  },
  {
    id: 'compare',
    label: 'Compare Auto vs Cab for a city tour',
    icon: 'compare-arrows',
  },
  {
    id: 'nearby',
    label: 'Show spots near me',
    icon: 'near-me',
  },
];

export const VISIT_SPOTS = [
  {
    id: 'marina',
    name: 'Marina Beach Promenade',
    area: 'Kamarajar Salai, Triplicane',
    category: 'Tourist',
    duration: '1 hr 30 min',
    icon: 'beach-access',
  },
  {
    id: 'kapaleeshwarar',
    name: 'Kapaleeshwarar Temple',
    area: 'Mylapore',
    category: 'Heritage',
    duration: '45 min',
    icon: 'temple-hindu',
  },
  {
    id: 'santhome',
    name: 'San Thome Basilica',
    area: 'San Thome High Rd',
    category: 'Heritage',
    duration: '40 min',
    icon: 'church',
  },
  {
    id: 'phoenix',
    name: 'Phoenix Marketcity',
    area: 'Velachery Main Rd',
    category: 'Shopping',
    duration: '2 hrs',
    icon: 'local-mall',
  },
  {
    id: 'auroville',
    name: 'Auroville Matrimandir',
    area: 'Auroville, Pondicherry',
    category: 'Heritage',
    duration: '2 hrs',
    icon: 'spa',
  },
  {
    id: 'rockBeach',
    name: 'Rock Beach Promenade',
    area: 'Goubert Ave, White Town',
    category: 'Tourist',
    duration: '1 hr',
    icon: 'beach-access',
  },
  {
    id: 'paradise',
    name: 'Paradise Beach',
    area: 'Chunnambar Backwaters',
    category: 'Adventure',
    duration: '2 hrs',
    icon: 'sailing',
  },
  {
    id: 'whiteTown',
    name: 'White Town Heritage Walk',
    area: 'Rue Suffren, Pondicherry',
    category: 'Heritage',
    duration: '1 hr 30 min',
    icon: 'castle',
  },
];

export const SAMPLE_ITINERARIES = [
  {
    id: 'chennaiDay',
    title: 'Chennai Heritage Day Tour',
    days: [
      {
        label: 'Day 1',
        stops: [
          { id: 'c1', spotId: 'marina', time: '07:30 AM', vehicle: 'Auto', fare: 96, action: 'ride' },
          { id: 'c2', spotId: 'kapaleeshwarar', time: '10:00 AM', vehicle: 'Auto', fare: 110, action: 'ride' },
          { id: 'c3', spotId: 'santhome', time: '12:30 PM', vehicle: 'Auto', fare: 85, action: 'ride' },
          { id: 'c4', spotId: 'phoenix', time: '05:00 PM', vehicle: 'Cab', fare: 260, action: 'ride' },
        ],
      },
    ],
    totalStops: 4,
    totalFare: 551,
  },
  {
    id: 'pondicherryWeekend',
    title: 'Pondicherry Weekend Escape',
    days: [
      {
        label: 'Day 1',
        stops: [
          { id: 'p1', spotId: 'auroville', time: '09:00 AM', vehicle: 'Cab', fare: 240, action: 'ride' },
          { id: 'p2', spotId: 'rockBeach', time: '04:30 PM', vehicle: 'Auto', fare: 70, action: 'ride' },
        ],
      },
      {
        label: 'Day 2',
        stops: [
          { id: 'p3', spotId: 'paradise', time: '08:30 AM', vehicle: 'Auto', fare: 130, action: 'ride' },
          { id: 'p4', spotId: 'whiteTown', time: '02:00 PM', vehicle: 'Auto', fare: 60, action: 'ride' },
        ],
      },
    ],
    totalStops: 4,
    totalFare: 500,
  },
];
