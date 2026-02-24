export default async function handler(req, res) {
  const { q } = req.query;
  console.log('🎯 API called with query:', q);
  
  const mockResults = [
    {
      id: 'hotel-1',
      title: 'Grand Plaza Hotel',
      description: 'Luxury 5-star hotel with premium amenities in Paris, France',
      category: 'Hospitality',
      type: 'business',
      icon: 'Hotel',
      href: '/hotels/1',
      tags: ['5-star', 'Paris, France', 'luxury', 'spa', 'pool'],
      relevance: 95
    },
    {
      id: 'hotel-2',
      title: 'Oceanview Resort',
      description: 'Beachfront resort in Nice, France with ocean views',
      category: 'Hospitality',
      type: 'business',
      icon: 'Hotel',
      href: '/hotels/2',
      tags: ['resort', 'Nice, France', 'beach', 'spa'],
      relevance: 90
    }
  ].filter(item => 
    !q || 
    item.title.toLowerCase().includes(q.toLowerCase()) ||
    item.description.toLowerCase().includes(q.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase()))
  );

  res.status(200).json(mockResults);
}
