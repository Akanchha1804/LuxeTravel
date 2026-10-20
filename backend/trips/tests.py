from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import ChatRoom, Trip


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_signup_login_and_me(self):
        response = self.client.post(
            "/api/signup/",
            {"username": "traveller", "email": "traveller@example.com", "password": "S3curePass!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)

        me = self.client.get(
            "/api/me/", HTTP_AUTHORIZATION=f"Token {response.data['token']}"
        )
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["username"], "traveller")

        login = self.client.post(
            "/api/login/",
            {"username": "traveller@example.com", "password": "S3curePass!"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

    def test_signup_rejects_short_password_and_duplicate(self):
        short = self.client.post(
            "/api/signup/",
            {"username": "short", "email": "short@example.com", "password": "abc"},
            format="json",
        )
        self.assertEqual(short.status_code, 400)
        self.assertIn("error", short.data)

        User.objects.create_user("taken", "taken@example.com", "S3curePass!")
        duplicate = self.client.post(
            "/api/signup/",
            {"username": "taken", "email": "new@example.com", "password": "S3curePass!"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 400)


class TripApiTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@example.com", "S3curePass!")
        self.other = User.objects.create_user("other", "other@example.com", "S3curePass!")
        self.owner_client = APIClient()
        self.owner_client.credentials(
            HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=self.owner).key}"
        )
        self.other_client = APIClient()
        self.other_client.credentials(
            HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=self.other).key}"
        )
        self.anon = APIClient()
        self.start = timezone.localdate() + timedelta(days=10)
        self.end = self.start + timedelta(days=3)

    def _create_trip(self, client=None):
        return (client or self.owner_client).post(
            "/api/trips/",
            {
                "destination": "Kyoto",
                "start_date": self.start.isoformat(),
                "end_date": self.end.isoformat(),
                "budget": "moderate",
                "itinerary": {"days": [{"day": 1, "title": "Arrival", "activities": ["Rest"]}]},
            },
            format="json",
        )

    def test_trips_are_private_to_owner(self):
        created = self._create_trip()
        self.assertEqual(created.status_code, 201)
        trip_id = created.data["id"]
        self.assertEqual(float(created.data["budget"]), 100000.0)
        self.assertEqual(created.data["itinerary_data"]["days"][0]["title"], "Arrival")

        self.assertEqual(self.other_client.get("/api/trips/").data, [])
        self.assertEqual(self.other_client.get(f"/api/trips/{trip_id}/").status_code, 404)
        self.assertEqual(
            self.other_client.patch(
                f"/api/trips/{trip_id}/", {"destination": "Hacked"}, format="json"
            ).status_code,
            404,
        )

    def test_anonymous_cannot_create_or_list(self):
        self.assertEqual(self.anon.get("/api/trips/").status_code, 401)
        self.assertEqual(
            self.anon.post(
                "/api/trips/",
                {
                    "destination": "Paris",
                    "start_date": self.start.isoformat(),
                    "end_date": self.end.isoformat(),
                    "budget": 50000,
                },
                format="json",
            ).status_code,
            401,
        )

    def test_invalid_dates_rejected(self):
        response = self.owner_client.post(
            "/api/trips/",
            {
                "destination": "Paris",
                "start_date": self.end.isoformat(),
                "end_date": self.start.isoformat(),
                "budget": 50000,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_share_and_fork(self):
        created = self._create_trip()
        trip_id = created.data["id"]

        shared = self.owner_client.post(f"/api/trips/{trip_id}/make-public/")
        self.assertEqual(shared.status_code, 200)
        share_code = shared.data["share_code"]

        public = self.anon.get(f"/api/shared/{share_code}/")
        self.assertEqual(public.status_code, 200)

        forked = self.other_client.post(f"/api/shared/{share_code}/fork/")
        self.assertEqual(forked.status_code, 200)
        self.assertEqual(forked.data["trip"]["destination"], "Kyoto")
        self.assertTrue(
            Trip.objects.filter(
                id=forked.data["trip"]["id"], forked_from_id=trip_id, user=self.other
            ).exists()
        )

    def test_preview_is_graceful_without_ai(self):
        response = self.anon.post(
            "/api/trips/preview/",
            {
                "destination": "Kyoto",
                "start_date": self.start.isoformat(),
                "end_date": self.end.isoformat(),
                "budget": "moderate",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "ai_unavailable")


class ChatTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("chatty", "chatty@example.com", "S3curePass!")
        self.client = APIClient()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=self.user).key}"
        )
        self.anon = APIClient()

    def test_private_rooms_are_not_listed(self):
        ChatRoom.objects.create(name="Lobby", is_private=False)
        ChatRoom.objects.create(name="Secret", is_private=True)

        names = [room["name"] for room in self.anon.get("/api/chatrooms/").data]
        self.assertIn("Lobby", names)
        self.assertNotIn("Secret", names)

    def test_private_room_messages_require_code(self):
        room = ChatRoom.objects.create(name="Secret", is_private=True)
        self.assertEqual(self.anon.get(f"/api/chatrooms/{room.id}/messages/").status_code, 404)
        allowed = self.anon.get(
            f"/api/chatrooms/{room.id}/messages/", HTTP_X_ROOM_CODE=room.room_code
        )
        self.assertEqual(allowed.status_code, 200)

    def test_create_requires_login_and_only_owner_can_delete(self):
        self.assertEqual(
            self.anon.post("/api/chatrooms/", {"name": "Anon room"}, format="json").status_code,
            401,
        )
        created = self.client.post("/api/chatrooms/", {"name": "My room"}, format="json")
        self.assertEqual(created.status_code, 201)
        room_id = created.data["id"]

        other = User.objects.create_user("other", "other@example.com", "S3curePass!")
        other_client = APIClient()
        other_client.credentials(
            HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=other).key}"
        )
        self.assertEqual(other_client.delete(f"/api/chatrooms/{room_id}/").status_code, 403)
        self.assertEqual(self.client.delete(f"/api/chatrooms/{room_id}/").status_code, 204)


class HealthTests(TestCase):
    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["database"], "ok")
