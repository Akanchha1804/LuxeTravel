import json
import re

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Booking,
    ChatRoom,
    Destination,
    Message,
    Trip,
    UserActivity,
)

BUDGET_PRESETS = {
    "budget": 35000,
    "moderate": 100000,
    "mid-range": 100000,
    "luxury": 250000,
}


def normalize_budget(value):
    """Accept labels ("moderate"), ranges ("20k - 50k") or plain numbers."""
    if value is None or value == "":
        return 50000

    if isinstance(value, (int, float)):
        return max(float(value), 0)

    text = str(value).strip().lower()
    if text in BUDGET_PRESETS:
        return BUDGET_PRESETS[text]

    text = text.replace(",", "").replace("₹", "").replace("inr", "").strip()
    match = re.search(r"(\d+(?:\.\d+)?)\s*(k|l|lakh|crore|cr)?", text)
    if not match:
        return 50000

    amount = float(match.group(1))
    unit = match.group(2)
    if unit == "k":
        amount *= 1_000
    elif unit in {"l", "lakh"}:
        amount *= 100_000
    elif unit in {"crore", "cr"}:
        amount *= 10_000_000
    return max(amount, 0)


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]
        extra_kwargs = {
            "email": {"required": True, "allow_blank": False},
            "username": {"required": True},
        }

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with that email already exists.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserActivity
        fields = "__all__"


class TripSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")
    itinerary_data = serializers.SerializerMethodField()
    days_count = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = "__all__"
        read_only_fields = [
            "user",
            "share_code",
            "is_public",
            "fork_count",
            "forked_from",
            "chat_room",
            "created_at",
        ]

    def get_itinerary_data(self, obj):
        if not obj.itinerary:
            return None
        try:
            return json.loads(obj.itinerary)
        except (TypeError, ValueError):
            return {"raw": obj.itinerary}

    def get_days_count(self, obj):
        if not obj.start_date or not obj.end_date:
            return 0
        return (obj.end_date - obj.start_date).days + 1

    def to_internal_value(self, data):
        mutable = data.copy()
        if "budget" in mutable:
            mutable["budget"] = normalize_budget(mutable["budget"])
        preferences = mutable.get("preferences")
        if isinstance(preferences, (list, dict)):
            mutable["preferences"] = json.dumps(preferences)
        itinerary = mutable.get("itinerary")
        if isinstance(itinerary, (list, dict)):
            mutable["itinerary"] = json.dumps(itinerary)
        return super().to_internal_value(mutable)

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "The end date must be on or after the start date."}
            )
        return attrs


class BookingSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")
    trip_destination = serializers.ReadOnlyField(source="trip.destination")

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = ["user", "status", "created_at", "raw_response"]


class DestinationSerializer(serializers.ModelSerializer):
    trip_types_list = serializers.SerializerMethodField()
    activities_list = serializers.SerializerMethodField()

    class Meta:
        model = Destination
        fields = "__all__"

    def get_trip_types_list(self, obj):
        return obj.get_trip_types_list()

    def get_activities_list(self, obj):
        return obj.get_activities_list()


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = ["timestamp"]

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Message cannot be empty.")
        if len(value) > 2000:
            raise serializers.ValidationError("Message is too long (max 2000 characters).")
        return value

    def validate_sender(self, value):
        value = (value or "Guest").strip()[:100]
        return value or "Guest"


class ChatRoomSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source="created_by.username")
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = "__all__"
        read_only_fields = ["room_code", "created_at", "created_by"]

    def get_message_count(self, obj):
        return obj.messages.count()
