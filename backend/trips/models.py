from django.db import models
from django.contrib.auth.models import User
import uuid

class UserActivity(models.Model):
    """Track user searches and preferences for AI-powered recommendations"""
    session_id = models.CharField(max_length=255, db_index=True)  # Browser session ID
    destination_searched = models.CharField(max_length=255)
    preferences = models.TextField(blank=True, null=True)  # Comma-separated preferences
    budget_range = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_id', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.session_id} - {self.destination_searched}"

class Trip(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='trips',
        null=True,
        blank=True
    )
    destination = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    preferences = models.TextField(blank=True, null=True)  # Store user preferences
    itinerary = models.TextField(blank=True, null=True)
    session_id = models.CharField(max_length=255, blank=True, null=True)  # Link to user activity
    
    # Phase 4: Social & Collaboration
    share_code = models.CharField(max_length=12, unique=True, blank=True, null=True, db_index=True)
    is_public = models.BooleanField(default=False)
    chat_room = models.ForeignKey('ChatRoom', on_delete=models.SET_NULL, null=True, blank=True, related_name='trip')
    forked_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='forks')
    fork_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["share_code"]),
        ]

    def save(self, *args, **kwargs):
        # Generate share code if not exists
        if not self.share_code:
            self.share_code = str(uuid.uuid4())[:12].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.destination} ({self.start_date} - {self.end_date})"

class Booking(models.Model):
    """Store booking references from external providers"""
    PROVIDER_CHOICES = [
        ('flight', 'Flight'),
        ('hotel', 'Hotel'),
        ('bus', 'Bus'),
        ('train', 'Train'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='bookings')
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    reference_id = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    raw_response = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.provider} - {self.reference_id} ({self.status})"

class Destination(models.Model):
    """Destinations for moodboard filtering"""
    TRIP_TYPE_CHOICES = [
        ('adventure', 'Adventure'),
        ('relaxation', 'Relaxation'),
        ('cultural', 'Cultural'),
        ('romantic', 'Romantic'),
        ('family', 'Family'),
        ('luxury', 'Luxury'),
        ('budget', 'Budget'),
    ]
    
    REGION_CHOICES = [
        ('europe', 'Europe'),
        ('asia', 'Asia'),
        ('africa', 'Africa'),
        ('north_america', 'North America'),
        ('south_america', 'South America'),
        ('oceania', 'Oceania'),
        ('middle_east', 'Middle East'),
    ]
    
    name = models.CharField(max_length=255)
    country = models.CharField(max_length=100)
    region = models.CharField(max_length=50, choices=REGION_CHOICES)
    trip_types = models.CharField(max_length=255)  # Comma-separated: adventure,relaxation
    activities = models.TextField()  # Comma-separated: hiking,beaches,historical tours
    description = models.TextField()
    image_url = models.URLField(max_length=500, blank=True, null=True)
    best_time_to_visit = models.CharField(max_length=100, blank=True, null=True)
    average_cost = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name}, {self.country}"
    
    def get_trip_types_list(self):
        return [t.strip() for t in self.trip_types.split(',') if t.strip()]
    
    def get_activities_list(self):
        return [a.strip() for a in self.activities.split(',') if a.strip()]


class ChatRoom(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_private = models.BooleanField(default=False)
    room_code = models.CharField(max_length=10, unique=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="chat_rooms"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.room_code:
            self.room_code = str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Message(models.Model):
    room = models.ForeignKey(ChatRoom, related_name='messages', on_delete=models.CASCADE)
    sender = models.CharField(max_length=100) # Simple username for now
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
