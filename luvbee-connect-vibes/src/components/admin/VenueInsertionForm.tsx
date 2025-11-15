import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Plus, Loader2 } from 'lucide-react';

interface VenueFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  website?: string;
  latitude: number;
  longitude: number;
  types: string[];
  is_adult: boolean;
  google_place_id?: string;
  rating?: number;
  price_level?: number;
  opening_hours?: any;
  photos?: any[];
}

export function VenueInsertionForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'BR',
    phone: '',
    website: '',
    latitude: 0,
    longitude: 0,
    types: ['bar'],
    is_adult: false,
    google_place_id: '',
    rating: 0,
    price_level: 0,
    opening_hours: null,
    photos: []
  });

  const handleInputChange = (field: keyof VenueFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Preparar os dados para inserção
      const venueData = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        phone: formData.phone || null,
        website: formData.website || null,
        lat: formData.latitude,
        lng: formData.longitude,
        types: formData.types,
        is_adult: formData.is_adult,
        google_place_id: formData.google_place_id || null,
        rating: formData.rating || null,
        price_level: formData.price_level || null,
        opening_hours: formData.opening_hours,
        photos: formData.photos,
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('locations')
        .insert([venueData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: 'Sucesso!',
        description: `Local "${data.name}" inserido com sucesso.`,
        className: 'bg-green-50 border-green-200'
      });

      // Limpar formulário
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'BR',
        phone: '',
        website: '',
        latitude: 0,
        longitude: 0,
        types: ['bar'],
        is_adult: false,
        google_place_id: '',
        rating: 0,
        price_level: 0,
        opening_hours: null,
        photos: []
      });

    } catch (error: any) {
      console.error('Erro ao inserir local:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao inserir local. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const placeTypes = [
    { value: 'bar', label: 'Bar' },
    { value: 'night_club', label: 'Boate/Clube' },
    { value: 'restaurant', label: 'Restaurante' },
    { value: 'cafe', label: 'Café' },
    { value: 'shopping_mall', label: 'Shopping' },
    { value: 'adult_entertainment', label: 'Entretenimento Adulto' }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle>Inserir Local Manualmente</CardTitle>
        </div>
        <CardDescription>
          Adicione novos locais ao banco de dados para enriquecer a base de dados local
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Local *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Bar do Zé"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="types">Tipo *</Label>
              <Select
                value={formData.types[0]}
                onValueChange={(value) => handleInputChange('types', [value])}
              >
                <SelectTrigger id="types">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {placeTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço Completo *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Rua, número, bairro"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="São Paulo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="SP"
                maxLength={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">CEP</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                placeholder="00000-000"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude *</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value) || 0)}
                placeholder="-23.550520"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude *</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value) || 0)}
                placeholder="-46.633308"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.exemplo.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rating">Avaliação (0-5)</Label>
              <Input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseFloat(e.target.value) || 0)}
                placeholder="4.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_level">Nível de Preço (0-4)</Label>
              <Select
                value={formData.price_level.toString()}
                onValueChange={(value) => handleInputChange('price_level', parseInt(value))}
              >
                <SelectTrigger id="price_level">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Grátis</SelectItem>
                  <SelectItem value="1">Barato</SelectItem>
                  <SelectItem value="2">Moderado</SelectItem>
                  <SelectItem value="3">Caro</SelectItem>
                  <SelectItem value="4">Muito Caro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="is_adult"
                checked={formData.is_adult}
                onChange={(e) => handleInputChange('is_adult', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_adult" className="text-sm font-medium">
                Conteúdo Adulto
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_place_id">Google Place ID (opcional)</Label>
            <Input
              id="google_place_id"
              value={formData.google_place_id}
              onChange={(e) => handleInputChange('google_place_id', e.target.value)}
              placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({
                name: '',
                address: '',
                city: '',
                state: '',
                postal_code: '',
                country: 'BR',
                phone: '',
                website: '',
                latitude: 0,
                longitude: 0,
                types: ['bar'],
                is_adult: false,
                google_place_id: '',
                rating: 0,
                price_level: 0,
                opening_hours: null,
                photos: []
              })}
              disabled={isLoading}
            >
              Limpar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inserindo...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Inserir Local
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}